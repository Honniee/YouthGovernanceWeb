--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 15.13

-- Started on 2025-09-08 16:11:05



--
-- TOC entry 6 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- TOC entry 2 (class 3079 OID 16684)
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- TOC entry 3478 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- TOC entry 922 (class 1247 OID 16724)
-- Name: enum_SK_Officials_position; Type: TYPE; Schema: public; Owner: -
--

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'enum_SK_Officials_position' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public."enum_SK_Officials_position" AS ENUM (
            'SK Chairperson',
            'SK Secretary',
            'SK Treasurer',
            'SK Councilor'
        );
    END IF;
END $$ LANGUAGE plpgsql;


--
-- TOC entry 919 (class 1247 OID 16716)
-- Name: enum_SK_Terms_status; Type: TYPE; Schema: public; Owner: -
--

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'enum_SK_Terms_status' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public."enum_SK_Terms_status" AS ENUM (
            'upcoming',
            'active',
            'completed'
        );
    END IF;
END $$ LANGUAGE plpgsql;


--
-- TOC entry 925 (class 1247 OID 16734)
-- Name: enum_Users_user_type; Type: TYPE; Schema: public; Owner: -
--

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'enum_Users_user_type' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public."enum_Users_user_type" AS ENUM (
            'admin',
            'lydo_staff',
            'sk_official',
            'youth'
        );
    END IF;
END $$ LANGUAGE plpgsql;


--
-- TOC entry 256 (class 1255 OID 16861)
-- Name: calculate_batch_statistics(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.calculate_batch_statistics(batch_id_param character varying) RETURNS TABLE(total_responses integer, validated_responses integer, rejected_responses integer, pending_responses integer, total_youths integer, total_youths_surveyed integer, total_youths_not_surveyed integer, response_rate numeric, validation_rate numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Response counts from KK_Survey_Responses
        COALESCE(COUNT(ksr.response_id), 0)::INTEGER as total_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated'), 0)::INTEGER as validated_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'rejected'), 0)::INTEGER as rejected_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'pending'), 0)::INTEGER as pending_responses,
        
        -- Total youth count from Voters_List (ages 15-30)
        (SELECT COUNT(*) FROM "Voters_List" vl 
         WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30)::INTEGER as total_youths,
        
        -- Surveyed count (unique youth who responded)
        COALESCE(COUNT(DISTINCT ksr.youth_id), 0)::INTEGER as total_youths_surveyed,
        
        -- Not surveyed count
        ((SELECT COUNT(*) FROM "Voters_List" vl 
          WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30) - 
         COUNT(DISTINCT ksr.youth_id))::INTEGER as total_youths_not_surveyed,
        
        -- Response rate (total responses / total youth population)
        CASE 
            WHEN (SELECT COUNT(*) FROM "Voters_List" vl 
                  WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30) > 0 
            THEN ROUND((COUNT(ksr.response_id)::DECIMAL / 
                (SELECT COUNT(*) FROM "Voters_List" vl 
                 WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30)) * 100, 2)
            ELSE 0.00
        END as response_rate,
        
        -- Validation rate (validated responses / total responses)
        CASE 
            WHEN COUNT(ksr.response_id) > 0 THEN ROUND((COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated')::DECIMAL / COUNT(ksr.response_id)) * 100, 2)
            ELSE 0.00
        END as validation_rate
        
    FROM "KK_Survey_Responses" ksr
    WHERE ksr.batch_id = batch_id_param;
END;
$$;


--
-- TOC entry 252 (class 1255 OID 16824)
-- Name: check_active_kk_survey(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.check_active_kk_survey(excluding_batch_id character varying DEFAULT NULL::character varying) RETURNS TABLE(batch_id character varying, batch_name character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT kb.batch_id, kb.batch_name
    FROM "KK_Survey_Batches" kb
    WHERE kb.status = 'active'
    AND (excluding_batch_id IS NULL OR kb.batch_id != excluding_batch_id);
END;
$$;


--
-- TOC entry 3479 (class 0 OID 0)
-- Dependencies: 252
-- Name: FUNCTION check_active_kk_survey(excluding_batch_id character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_active_kk_survey(excluding_batch_id character varying) IS 'Returns any active KK survey batches, optionally excluding a specific batch ID';


--
-- TOC entry 253 (class 1255 OID 16825)
-- Name: check_batch_date_conflicts(date, date, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.check_batch_date_conflicts(start_date_param date, end_date_param date, excluding_batch_id character varying DEFAULT NULL::character varying) RETURNS TABLE(batch_id character varying, batch_name character varying, start_date date, end_date date, status text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT kb.batch_id, kb.batch_name, kb.start_date, kb.end_date, kb.status
    FROM "KK_Survey_Batches" kb
    WHERE kb.status != 'closed'
    AND (excluding_batch_id IS NULL OR kb.batch_id != excluding_batch_id)
    AND (
        -- New batch starts during existing batch
        (start_date_param BETWEEN kb.start_date AND kb.end_date)
        OR
        -- New batch ends during existing batch
        (end_date_param BETWEEN kb.start_date AND kb.end_date)
        OR
        -- New batch completely encompasses existing batch
        (start_date_param <= kb.start_date AND end_date_param >= kb.end_date)
    );
END;
$$;


--
-- TOC entry 3480 (class 0 OID 0)
-- Dependencies: 253
-- Name: FUNCTION check_batch_date_conflicts(start_date_param date, end_date_param date, excluding_batch_id character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_batch_date_conflicts(start_date_param date, end_date_param date, excluding_batch_id character varying) IS 'Returns batches that have date conflicts with the provided date range';


--
-- TOC entry 249 (class 1255 OID 16848)
-- Name: check_duplicate_participation(character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.check_duplicate_participation(p_voter_id character varying, p_batch_id character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM "Youth_Participation_Tracking" 
        WHERE voter_id = p_voter_id 
          AND batch_id = p_batch_id 
          AND validation_status = 'validated'
    );
END;
$$;


--
-- TOC entry 3481 (class 0 OID 0)
-- Dependencies: 249
-- Name: FUNCTION check_duplicate_participation(p_voter_id character varying, p_batch_id character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_duplicate_participation(p_voter_id character varying, p_batch_id character varying) IS 'Checks if a voter has already participated in a specific batch';


--
-- TOC entry 250 (class 1255 OID 16849)
-- Name: get_batch_validation_stats(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_batch_validation_stats(batch_id_param character varying) RETURNS TABLE(total_responses integer, automatic_validations integer, manual_validations integer, final_reviews integer, pending_validations integer, validation_breakdown json)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_responses,
        COUNT(*) FILTER (WHERE validation_tier = 'automatic')::INTEGER as automatic_validations,
        COUNT(*) FILTER (WHERE validation_tier = 'manual')::INTEGER as manual_validations,
        COUNT(*) FILTER (WHERE validation_tier = 'final')::INTEGER as final_reviews,
        COUNT(*) FILTER (WHERE validation_status = 'pending')::INTEGER as pending_validations,
        json_build_object(
            'automatic', COUNT(*) FILTER (WHERE validation_tier = 'automatic'),
            'manual', COUNT(*) FILTER (WHERE validation_tier = 'manual'),
            'final', COUNT(*) FILTER (WHERE validation_tier = 'final'),
            'pending', COUNT(*) FILTER (WHERE validation_status = 'pending')
        ) as validation_breakdown
    FROM "KK_Survey_Responses"
    WHERE batch_id = batch_id_param;
END;
$$;


--
-- TOC entry 3482 (class 0 OID 0)
-- Dependencies: 250
-- Name: FUNCTION get_batch_validation_stats(batch_id_param character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_batch_validation_stats(batch_id_param character varying) IS 'Returns comprehensive validation statistics for a batch including tier breakdown';


--
-- TOC entry 254 (class 1255 OID 16826)
-- Name: get_batches_needing_status_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_batches_needing_status_update() RETURNS TABLE(batch_id character varying, batch_name character varying, current_status text, suggested_status text, reason text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kb.batch_id,
        kb.batch_name,
        kb.status as current_status,
        CASE 
            WHEN kb.status = 'draft' AND CURRENT_DATE >= kb.start_date AND CURRENT_DATE <= kb.end_date THEN 'active'
            WHEN kb.status = 'active' AND CURRENT_DATE > kb.end_date THEN 'closed'
            ELSE kb.status
        END as suggested_status,
        CASE 
            WHEN kb.status = 'draft' AND CURRENT_DATE >= kb.start_date AND CURRENT_DATE <= kb.end_date 
                THEN 'Start date reached'
            WHEN kb.status = 'active' AND CURRENT_DATE > kb.end_date 
                THEN 'End date passed'
            ELSE 'No change needed'
        END as reason
    FROM "KK_Survey_Batches" kb
    WHERE (
        (kb.status = 'draft' AND CURRENT_DATE >= kb.start_date AND CURRENT_DATE <= kb.end_date)
        OR
        (kb.status = 'active' AND CURRENT_DATE > kb.end_date)
    );
END;
$$;


--
-- TOC entry 3483 (class 0 OID 0)
-- Dependencies: 254
-- Name: FUNCTION get_batches_needing_status_update(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_batches_needing_status_update() IS 'Returns batches that need automatic status updates based on current date';


--
-- TOC entry 255 (class 1255 OID 16828)
-- Name: update_batch_pause_timestamps(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_batch_pause_timestamps() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- If status changed to paused and paused_at is not set
    IF NEW.status = 'active' AND OLD.status != 'active' AND NEW.paused_at IS NOT NULL THEN
        -- This is a resume action, set resumed_at
        NEW.resumed_at = CURRENT_TIMESTAMP;
        NEW.paused_at = NULL;
        NEW.paused_reason = NULL;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- TOC entry 234 (class 1255 OID 16398)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$;


--
-- TOC entry 248 (class 1255 OID 16847)
-- Name: validate_survey_response(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.validate_survey_response(p_response_id character varying) RETURNS TABLE(validation_tier text, validation_score numeric, voter_match_id character varying, validation_notes text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    response_record RECORD;
    voter_match RECORD;
    match_score DECIMAL(3,2) := 0.0;
    tier_result TEXT := 'manual';
BEGIN
    -- Get survey response details
    SELECT * INTO response_record 
    FROM "KK_Survey_Responses" 
    WHERE response_id = p_response_id;
    
    -- Try to find voter match
    SELECT vl.*, 
           -- Calculate match score
           CASE 
               WHEN LOWER(TRIM(vl.first_name)) = LOWER(TRIM(response_record.survey_first_name)) THEN 0.3
               ELSE 0.0
           END +
           CASE 
               WHEN LOWER(TRIM(vl.last_name)) = LOWER(TRIM(response_record.survey_last_name)) THEN 0.3
               ELSE 0.0
           END +
           CASE 
               WHEN vl.birth_date = response_record.survey_birth_date THEN 0.3
               ELSE 0.0
           END +
           CASE 
               WHEN vl.gender = response_record.survey_gender THEN 0.1
               ELSE 0.0
           END as calculated_score
    INTO voter_match
    FROM "Voters_List" vl
    WHERE vl.is_active = true
      AND vl.municipality = 'San Jose'
      AND vl.province = 'Batangas'
      AND vl.age BETWEEN 15 AND 30
    ORDER BY calculated_score DESC
    LIMIT 1;
    
    -- Determine validation tier based on match score
    IF voter_match.calculated_score >= 0.9 THEN
        tier_result := 'automatic';
    ELSIF voter_match.calculated_score >= 0.6 THEN
        tier_result := 'manual';
    ELSE
        tier_result := 'manual';
    END IF;
    
    RETURN QUERY SELECT 
        tier_result,
        COALESCE(voter_match.calculated_score, 0.0),
        voter_match.voter_id,
        CASE 
            WHEN voter_match.calculated_score >= 0.9 THEN 'Automatic validation - high confidence match'
            WHEN voter_match.calculated_score >= 0.6 THEN 'Manual validation required - partial match'
            ELSE 'Manual validation required - no voter match found'
        END;
END;
$$;


--
-- TOC entry 3484 (class 0 OID 0)
-- Dependencies: 248
-- Name: FUNCTION validate_survey_response(p_response_id character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_survey_response(p_response_id character varying) IS 'Validates a survey response against the voter list and returns validation tier, score, and match information';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 227 (class 1259 OID 16574)
-- Name: Activity_Logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Activity_Logs" (
    log_id character varying(20) NOT NULL,
    user_id character varying(20),
    user_type text,
    action character varying(100) NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id character varying(20),
    resource_name character varying(100),
    details jsonb,
    category text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    success boolean DEFAULT true,
    error_message text,
    CONSTRAINT "Activity_Logs_category_check" CHECK ((category = ANY (ARRAY['Authentication'::text, 'User Management'::text, 'Survey Management'::text, 'Announcement'::text, 'Activity Log'::text, 'Data Export'::text, 'Data Management'::text, 'System Management'::text]))),
    CONSTRAINT "Activity_Logs_user_type_check" CHECK ((user_type = ANY (ARRAY['admin'::text, 'lydo_staff'::text, 'sk_official'::text, 'youth'::text, 'anonymous'::text])))
);


--
-- TOC entry 229 (class 1259 OID 16599)
-- Name: Announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Announcements" (
    announcement_id character varying(20) NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    summary character varying(500),
    category text DEFAULT 'general'::text,
    status text DEFAULT 'draft'::text,
    image_url character varying(255),
    attachment_name character varying(255),
    attachment_url character varying(255),
    is_featured boolean DEFAULT false,
    is_pinned boolean DEFAULT false,
    published_at timestamp without time zone,
    created_by character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Announcements_category_check" CHECK ((category = ANY (ARRAY['general'::text, 'event'::text, 'survey'::text, 'meeting'::text, 'deadline'::text, 'achievement'::text, 'update'::text]))),
    CONSTRAINT "Announcements_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))
);


--
-- TOC entry 215 (class 1259 OID 16399)
-- Name: Barangay; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Barangay" (
    barangay_id character varying(20) NOT NULL,
    barangay_name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 224 (class 1259 OID 16523)
-- Name: KK_Survey_Batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."KK_Survey_Batches" (
    batch_id character varying(20) NOT NULL,
    batch_name character varying(100) NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'draft'::text,
    target_age_min integer DEFAULT 15,
    target_age_max integer DEFAULT 30,
    created_by character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    statistics_total_youths_surveyed integer DEFAULT 0,
    paused_at timestamp without time zone,
    paused_by character varying(20),
    paused_reason text,
    resumed_at timestamp without time zone,
    resumed_by character varying(20),
    CONSTRAINT "KK_Survey_Batches_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text, 'draft'::text])))
);


--
-- TOC entry 3485 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE "KK_Survey_Batches"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."KK_Survey_Batches" IS 'Survey batches table. Statistics are calculated in real-time using calculate_batch_statistics() function.';


--
-- TOC entry 3486 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN "KK_Survey_Batches".paused_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."KK_Survey_Batches".paused_at IS 'Timestamp when the batch was paused for maintenance';


--
-- TOC entry 3487 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN "KK_Survey_Batches".paused_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."KK_Survey_Batches".paused_by IS 'LYDO ID of the user who paused the batch';


--
-- TOC entry 3488 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN "KK_Survey_Batches".paused_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."KK_Survey_Batches".paused_reason IS 'Reason provided for pausing the batch';


--
-- TOC entry 3489 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN "KK_Survey_Batches".resumed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."KK_Survey_Batches".resumed_at IS 'Timestamp when the batch was resumed from pause';


--
-- TOC entry 3490 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN "KK_Survey_Batches".resumed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."KK_Survey_Batches".resumed_by IS 'LYDO ID of the user who resumed the batch';


--
-- TOC entry 225 (class 1259 OID 16543)
-- Name: KK_Survey_Responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."KK_Survey_Responses" (
    response_id character varying(20) NOT NULL,
    batch_id character varying(20) NOT NULL,
    youth_id character varying(20) NOT NULL,
    barangay_id character varying(20) NOT NULL,
    civil_status text,
    youth_classification text NOT NULL,
    youth_specific_needs text,
    youth_age_group text,
    educational_background text,
    work_status text,
    registered_sk_voter boolean,
    registered_national_voter boolean,
    attended_kk_assembly boolean,
    voted_last_sk boolean,
    times_attended text,
    reason_not_attended text,
    validation_status text DEFAULT 'pending'::text,
    validation_tier text DEFAULT 'automatic'::text,
    validated_by character varying(20),
    validation_date timestamp without time zone,
    validation_comments text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KK_Survey_Responses_civil_status_check" CHECK ((civil_status = ANY (ARRAY['Single'::text, 'Married'::text, 'Widowed'::text, 'Divorced'::text, 'Separated'::text, 'Annulled'::text, 'Unknown'::text, 'Live-in'::text]))),
    CONSTRAINT "KK_Survey_Responses_educational_background_check" CHECK ((educational_background = ANY (ARRAY['Elementary Level'::text, 'Elementary Grad'::text, 'High School Level'::text, 'High School Grad'::text, 'Vocational Grad'::text, 'College Level'::text, 'College Grad'::text, 'Masters Level'::text, 'Masters Grad'::text, 'Doctorate Level'::text, 'Doctorate Graduate'::text]))),
    CONSTRAINT "KK_Survey_Responses_reason_not_attended_check" CHECK ((reason_not_attended = ANY (ARRAY['There was no KK Assembly Meeting'::text, 'Not interested to Attend'::text]))),
    CONSTRAINT "KK_Survey_Responses_times_attended_check" CHECK ((times_attended = ANY (ARRAY['1-2 Times'::text, '3-4 Times'::text, '5 and above'::text]))),
    CONSTRAINT "KK_Survey_Responses_validation_status_check" CHECK ((validation_status = ANY (ARRAY['pending'::text, 'validated'::text, 'rejected'::text]))),
    CONSTRAINT "KK_Survey_Responses_validation_tier_check" CHECK ((validation_tier = ANY (ARRAY['automatic'::text, 'manual'::text, 'final'::text]))),
    CONSTRAINT "KK_Survey_Responses_work_status_check" CHECK ((work_status = ANY (ARRAY['Employed'::text, 'Unemployed'::text, 'Self-Employed'::text, 'Currently looking for a Job'::text, 'Not interested looking for a job'::text]))),
    CONSTRAINT "KK_Survey_Responses_youth_age_group_check" CHECK ((youth_age_group = ANY (ARRAY['Child Youth (15-17 yrs old)'::text, 'Core Youth (18-24 yrs old)'::text, 'Young Adult (15-30 yrs old)'::text]))),
    CONSTRAINT "KK_Survey_Responses_youth_classification_check" CHECK ((youth_classification = ANY (ARRAY['In School Youth'::text, 'Out of School Youth'::text, 'Working Youth'::text, 'Youth w/Specific Needs'::text]))),
    CONSTRAINT "KK_Survey_Responses_youth_specific_needs_check" CHECK ((youth_specific_needs = ANY (ARRAY['Person w/Disability'::text, 'Children in Conflict w/ Law'::text, 'Indigenous People'::text])))
);


--
-- TOC entry 217 (class 1259 OID 16420)
-- Name: LYDO; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LYDO" (
    lydo_id character varying(20) NOT NULL,
    role_id character varying(20) NOT NULL,
    email character varying(100) NOT NULL,
    personal_email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    middle_name character varying(50),
    suffix character varying(50),
    profile_picture character varying(255),
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    created_by character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deactivated boolean DEFAULT false,
    deactivated_at timestamp without time zone
);


--
-- TOC entry 228 (class 1259 OID 16585)
-- Name: Notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notifications" (
    notification_id character varying(20) NOT NULL,
    user_id character varying(20),
    user_type text,
    barangay_id character varying(20),
    title character varying(200) NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text,
    priority text DEFAULT 'normal'::text,
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    expires_at timestamp without time zone,
    created_by character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notifications_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT "Notifications_type_check" CHECK ((type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text, 'announcement'::text, 'survey_reminder'::text, 'validation_needed'::text, 'sk_term_end'::text, 'kk_batch_end'::text]))),
    CONSTRAINT "Notifications_user_type_check" CHECK ((user_type = ANY (ARRAY['admin'::text, 'lydo_staff'::text, 'sk_official'::text, 'youth'::text, 'all'::text])))
);


--
-- TOC entry 216 (class 1259 OID 16408)
-- Name: Roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Roles" (
    role_id character varying(20) NOT NULL,
    role_name character varying(50) NOT NULL,
    role_description text,
    permissions jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 219 (class 1259 OID 16456)
-- Name: SK_Officials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SK_Officials" (
    sk_id character varying(20) NOT NULL,
    role_id character varying(20) NOT NULL,
    term_id character varying(20) NOT NULL,
    email character varying(100) NOT NULL,
    personal_email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    barangay_id character varying(20) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    middle_name character varying(50),
    suffix character varying(50),
    "position" text NOT NULL,
    profile_picture character varying(255),
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    created_by character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    account_access boolean DEFAULT true,
    account_access_updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    account_access_updated_by character varying(20) DEFAULT NULL::character varying,
    CONSTRAINT "SK_Officials_position_check" CHECK (("position" = ANY (ARRAY['SK Chairperson'::text, 'SK Secretary'::text, 'SK Treasurer'::text, 'SK Councilor'::text])))
);


--
-- TOC entry 220 (class 1259 OID 16472)
-- Name: SK_Officials_Profiling; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SK_Officials_Profiling" (
    profiling_id character varying(20) NOT NULL,
    sk_id character varying(20) NOT NULL,
    birth_date date NOT NULL,
    age integer NOT NULL,
    gender text NOT NULL,
    contact_number character varying(20) NOT NULL,
    school_or_company character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    performance_metrics_survey_validated integer DEFAULT 0,
    CONSTRAINT "SK_Officials_Profiling_gender_check" CHECK ((gender = ANY (ARRAY['Male'::text, 'Female'::text])))
);


--
-- TOC entry 218 (class 1259 OID 16436)
-- Name: SK_Terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SK_Terms" (
    term_id character varying(20) NOT NULL,
    term_name character varying(100) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'upcoming'::text,
    is_active boolean DEFAULT true,
    is_current boolean DEFAULT false,
    created_by character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    statistics_total_officials integer DEFAULT 0,
    statistics_active_officials integer DEFAULT 0,
    statistics_inactive_officials integer DEFAULT 0,
    statistics_total_sk_chairperson integer DEFAULT 0,
    statistics_total_sk_secretary integer DEFAULT 0,
    statistics_total_sk_treasurer integer DEFAULT 0,
    statistics_total_sk_councilor integer DEFAULT 0,
    completion_type text,
    completed_by character varying(20) DEFAULT NULL::character varying,
    completed_at timestamp without time zone,
    last_status_change_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_status_change_by character varying(20) DEFAULT NULL::character varying,
    status_change_reason text,
    CONSTRAINT "SK_Terms_completion_type_check" CHECK ((completion_type = ANY (ARRAY['automatic'::text, 'forced'::text, 'manual'::text]))),
    CONSTRAINT "SK_Terms_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'upcoming'::text])))
);


--
-- TOC entry 222 (class 1259 OID 16503)
-- Name: Users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Users" (
    user_id character varying(20) NOT NULL,
    user_type text NOT NULL,
    lydo_id character varying(20),
    sk_id character varying(20),
    youth_id character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Users_user_type_check" CHECK ((user_type = ANY (ARRAY['admin'::text, 'lydo_staff'::text, 'sk_official'::text, 'youth'::text])))
);


--
-- TOC entry 226 (class 1259 OID 16564)
-- Name: Validation_Logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Validation_Logs" (
    log_id character varying(20) NOT NULL,
    response_id character varying(20) NOT NULL,
    validated_by character varying(20) NOT NULL,
    validation_action text NOT NULL,
    validation_tier text NOT NULL,
    validation_comments text,
    validation_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Validation_Logs_validation_action_check" CHECK ((validation_action = ANY (ARRAY['validate'::text, 'reject'::text]))),
    CONSTRAINT "Validation_Logs_validation_tier_check" CHECK ((validation_tier = ANY (ARRAY['automatic'::text, 'manual'::text, 'final'::text])))
);


--
-- TOC entry 223 (class 1259 OID 16513)
-- Name: Voters_List; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Voters_List" (
    voter_id character varying(20) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    middle_name character varying(50),
    suffix character varying(50),
    birth_date date NOT NULL,
    gender text,
    created_by character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT "Voters_List_gender_check" CHECK ((gender = ANY (ARRAY['Male'::text, 'Female'::text])))
);


--
-- TOC entry 3491 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN "Voters_List".is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Voters_List".is_active IS 'Flag to indicate if the voter record is active (true) or archived (false)';


--
-- TOC entry 221 (class 1259 OID 16485)
-- Name: Youth_Profiling; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Youth_Profiling" (
    youth_id character varying(20) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    middle_name character varying(50),
    suffix character varying(50),
    region character varying(50) DEFAULT 'Region IV-A (CALABARZON)'::character varying NOT NULL,
    province character varying(50) DEFAULT 'Batangas'::character varying NOT NULL,
    municipality character varying(50) DEFAULT 'San Jose'::character varying NOT NULL,
    barangay_id character varying(20) NOT NULL,
    purok_zone character varying(50),
    birth_date date NOT NULL,
    age integer NOT NULL,
    gender text NOT NULL,
    contact_number character varying(20) NOT NULL,
    email character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Youth_Profiling_gender_check" CHECK ((gender = ANY (ARRAY['Male'::text, 'Female'::text])))
);


--
-- TOC entry 233 (class 1259 OID 16862)
-- Name: active_batches_with_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.active_batches_with_stats AS
 SELECT kb.batch_id,
    kb.batch_name,
    kb.description,
    kb.start_date,
    kb.end_date,
    kb.status,
    kb.target_age_min,
    kb.target_age_max,
    kb.created_by,
    kb.created_at,
    kb.updated_at,
    kb.statistics_total_youths_surveyed,
    kb.paused_at,
    kb.paused_by,
    kb.paused_reason,
    kb.resumed_at,
    kb.resumed_by,
    stats.total_responses,
    stats.validated_responses,
    stats.rejected_responses,
    stats.pending_responses,
    stats.total_youths,
    stats.total_youths_surveyed,
    stats.total_youths_not_surveyed,
    stats.response_rate,
    stats.validation_rate,
        CASE
            WHEN (kb.status = 'active'::text) THEN (kb.end_date - CURRENT_DATE)
            ELSE NULL::integer
        END AS days_remaining,
        CASE
            WHEN ((kb.status = 'active'::text) AND (CURRENT_DATE > kb.end_date)) THEN true
            ELSE false
        END AS is_overdue
   FROM (public."KK_Survey_Batches" kb
     LEFT JOIN LATERAL public.calculate_batch_statistics(kb.batch_id) stats(total_responses, validated_responses, rejected_responses, pending_responses, total_youths, total_youths_surveyed, total_youths_not_surveyed, response_rate, validation_rate) ON (true))
  WHERE (kb.status = ANY (ARRAY['active'::text, 'draft'::text]));


--
-- TOC entry 232 (class 1259 OID 16835)
-- Name: batch_audit_trail; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.batch_audit_trail AS
 SELECT kb.batch_id,
    kb.batch_name,
    kb.status,
    kb.created_at,
    kb.updated_at,
    kb.paused_at,
    kb.paused_by,
    kb.paused_reason,
    kb.resumed_at,
    kb.resumed_by,
    concat(creator.first_name,
        CASE
            WHEN (creator.middle_name IS NOT NULL) THEN concat(' ', creator.middle_name)
            ELSE ''::text
        END, ' ', creator.last_name,
        CASE
            WHEN (creator.suffix IS NOT NULL) THEN concat(' ', creator.suffix)
            ELSE ''::text
        END) AS created_by_name,
    concat(pauser.first_name,
        CASE
            WHEN (pauser.middle_name IS NOT NULL) THEN concat(' ', pauser.middle_name)
            ELSE ''::text
        END, ' ', pauser.last_name,
        CASE
            WHEN (pauser.suffix IS NOT NULL) THEN concat(' ', pauser.suffix)
            ELSE ''::text
        END) AS paused_by_name,
    concat(resumer.first_name,
        CASE
            WHEN (resumer.middle_name IS NOT NULL) THEN concat(' ', resumer.middle_name)
            ELSE ''::text
        END, ' ', resumer.last_name,
        CASE
            WHEN (resumer.suffix IS NOT NULL) THEN concat(' ', resumer.suffix)
            ELSE ''::text
        END) AS resumed_by_name
   FROM (((public."KK_Survey_Batches" kb
     LEFT JOIN public."LYDO" creator ON (((kb.created_by)::text = (creator.lydo_id)::text)))
     LEFT JOIN public."LYDO" pauser ON (((kb.paused_by)::text = (pauser.lydo_id)::text)))
     LEFT JOIN public."LYDO" resumer ON (((kb.resumed_by)::text = (resumer.lydo_id)::text)));


--
-- TOC entry 3492 (class 0 OID 0)
-- Dependencies: 232
-- Name: VIEW batch_audit_trail; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.batch_audit_trail IS 'Audit trail view showing who created, paused, and resumed batches';


--
-- TOC entry 3470 (class 0 OID 16574)
-- Dependencies: 227
-- Data for Name: Activity_Logs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Activity_Logs" VALUES ('ACT001', 'USR001', 'admin', 'create_user', 'user', 'USR002', 'Juan Cruz Jr.', '{"email": "staff1@youthgovernance.com", "user_type": "lydo_staff"}', 'User Management', '2024-01-15 09:00:00', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT002', 'USR001', 'admin', 'create_user', 'user', 'USR007', 'Miguel Santos Jr.', '{"barangay": "SJB001", "user_type": "sk_official"}', 'User Management', '2024-01-16 10:30:00', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT003', 'USR001', 'admin', 'create_survey_batch', 'survey_batch', 'BAT001', 'KK Survey 2023 Q1', '{"end_date": "2023-03-31", "start_date": "2023-01-01"}', 'Survey Management', '2023-01-01 08:00:00', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT004', 'USR002', 'lydo_staff', 'view_survey_responses', 'survey_batch', 'BAT001', 'KK Survey 2023 Q1', '{"barangay_filter": "SJB001"}', 'Survey Management', '2023-02-20 14:15:00', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT005', 'USR007', 'sk_official', 'validate_response', 'survey_response', 'RES001', 'Youth Survey Response', '{"tier": "final", "validation_status": "validated"}', 'Survey Management', '2023-02-15 10:30:00', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT006', 'USR008', 'sk_official', 'validate_response', 'survey_response', 'RES004', 'Youth Survey Response', '{"tier": "final", "validation_status": "validated"}', 'Survey Management', '2023-02-18 11:45:00', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT007', 'USR001', 'admin', 'login', 'authentication', NULL, 'User Login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', 'Authentication', '2024-01-15 08:30:00', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT008', 'USR007', 'sk_official', 'login', 'authentication', NULL, 'User Login', '{"ip_address": "192.168.1.101", "user_agent": "Mozilla/5.0"}', 'Authentication', '2024-01-16 09:15:00', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT009', 'USR001', 'admin', 'create_survey_batch', 'survey_batch', 'BAT002', 'KK Survey 2023 Q2', '{"end_date": "2023-06-30", "start_date": "2023-04-01"}', 'Survey Management', '2023-04-01 08:00:00', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT010', 'USR001', 'admin', 'create_survey_batch', 'survey_batch', 'BAT003', 'KK Survey 2024 Q1', '{"end_date": "2024-03-31", "start_date": "2024-01-01"}', 'Survey Management', '2024-01-01 08:00:00', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT011', 'USR001', 'admin', 'create_survey_batch', 'survey_batch', 'BAT004', 'KK Survey 2024 Q2', '{"end_date": "2024-06-30", "start_date": "2024-04-01"}', 'Survey Management', '2024-04-01 08:00:00', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542752', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-19T16:22:22.752Z"}', 'Authentication', '2025-08-19 16:22:24.289006', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542753', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'LYDO006', 'LYDO006', '{"details": "Activated Staff Member: Roberto Aquino (ROL002)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-19 16:26:22.729969', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542754', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'LYDO002', 'LYDO002', '{"details": "Activated Staff Member: Juan Cruz (ROL002)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-19 16:26:31.212891', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542755', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'LYDO004', 'LYDO004', '{"details": "Activated Staff Member: Pedro Mendoza (ROL002)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-19 16:27:48.485027', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542756', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'LYDO003', 'LYDO003', '{"details": "Activated Staff Member: Ana Reyes (ROL002)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-19 16:29:14.808079', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542757', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'LYDO006', 'LYDO006', '{"details": "Deactivated Staff Member: Roberto Aquino (ROL002)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-19 16:30:33.834343', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542758', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'LYDO006', 'LYDO006', '{"details": "Activated Staff Member: Roberto Aquino (ROL002)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-19 16:49:58.086953', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542759', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'LYDO006', 'LYDO006', '{"details": "Deactivated Staff Member: Roberto Aquino (ROL002)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-19 17:02:40.110407', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542760', 'LYDO001', 'admin', 'EXPORT', 'unknown', 'bulk', 'bulk', '{"details": "Exported 11 Staff Members in CSV format (all export - status: all): Roberto Aquino (LYDO006), Juan Cruz (LYDO002), John Doe (LYDO008), Maria Garcia (LYDO010), Carlos Mendoza (LYDO011) and 6 more", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-19 17:02:46.536363', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542761', 'LYDO001', 'admin', 'BULK_IMPORT', 'unknown', 'bulk-1755623009215', 'bulk-1755623009215', '{"details": "Bulk imported 0 Staff Members from sample_staff_import.csv (4 total rows, 4 errors)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Management', '2025-08-19 17:03:29.274596', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542762', 'LYDO001', 'admin', 'CREATE', 'unknown', 'LYDO012', 'LYDO012', '{"details": "Created Staff Member: Tryyy carandang (ROL002) with email trydasdasd0099@gmail.com", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-19 17:04:35.225713', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542763', 'LYDO001', 'admin', 'UPDATE', 'unknown', 'LYDO006', 'LYDO006', '{"details": "Updated Staff Member: Roberto Aquino (ROL002)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-19 17:06:06.873669', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542764', 'LYDO001', 'admin', 'UPDATE', 'unknown', 'LYDO006', 'LYDO006', '{"details": "Updated Staff Member: Roberto Aquino (ROL002)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/139.0.0.0"}', 'User Management', '2025-08-19 17:08:30.188561', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542765', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'LYDO006', 'LYDO006', '{"details": "Activated Staff Member: Roberto Aquino (ROL002)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/139.0.0.0"}', 'User Management', '2025-08-19 17:13:26.997901', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542766', 'LYDO001', 'admin', 'CREATE', 'unknown', 'SK021', 'SK021', '{"details": "Created SK Official via bulk import: Juan Dela Cruz (SK Secretary)", "ipAddress": "127.0.0.1", "userAgent": "Bulk Import"}', 'User Management', '2025-08-19 17:50:09.416548', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542767', 'LYDO001', 'admin', 'CREATE', 'unknown', 'SK022', 'SK022', '{"details": "Created SK Official via bulk import: Ana Garcia (SK Treasurer)", "ipAddress": "127.0.0.1", "userAgent": "Bulk Import"}', 'User Management', '2025-08-19 17:50:10.348396', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542768', 'LYDO001', 'admin', 'CREATE', 'unknown', 'SK023', 'SK023', '{"details": "Created SK Official via bulk import: Carlos Rodriguez (SK Councilor)", "ipAddress": "127.0.0.1", "userAgent": "Bulk Import"}', 'User Management', '2025-08-19 17:50:11.749344', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542769', 'LYDO001', 'admin', 'CREATE', 'unknown', 'SK024', 'SK024', '{"details": "Created SK Official via bulk import: Miguel Torres (SK Secretary)", "ipAddress": "127.0.0.1", "userAgent": "Bulk Import"}', 'User Management', '2025-08-19 17:50:12.78242', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542770', 'LYDO001', 'admin', 'CREATE', 'unknown', 'SK025', 'SK025', '{"details": "Created SK Official via bulk import: Isabella Fernandez (SK Treasurer)", "ipAddress": "127.0.0.1", "userAgent": "Bulk Import"}', 'User Management', '2025-08-19 17:50:13.674776', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542771', 'LYDO001', 'admin', 'CREATE', 'unknown', 'SK026', 'SK026', '{"details": "Created SK Official via bulk import: Diego Ramirez (SK Councilor)", "ipAddress": "127.0.0.1", "userAgent": "Bulk Import"}', 'User Management', '2025-08-19 17:50:14.429091', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542772', 'LYDO001', 'admin', 'CREATE', 'unknown', 'SK027', 'SK027', '{"details": "Created SK Official via bulk import: Sebastian Vargas (SK Secretary)", "ipAddress": "127.0.0.1", "userAgent": "Bulk Import"}', 'User Management', '2025-08-19 17:50:15.465118', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542773', 'LYDO001', 'admin', 'CREATE', 'unknown', 'SK028', 'SK028', '{"details": "Created SK Official via bulk import: Valentina Castillo (SK Treasurer)", "ipAddress": "127.0.0.1", "userAgent": "Bulk Import"}', 'User Management', '2025-08-19 17:50:16.731486', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542774', 'LYDO001', 'admin', 'CREATE', 'unknown', 'SK029', 'SK029', '{"details": "Created SK Official via bulk import: Mateo Jimenez (SK Councilor)", "ipAddress": "127.0.0.1", "userAgent": "Bulk Import"}', 'User Management', '2025-08-19 17:50:17.552204', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542775', 'LYDO001', 'admin', 'CREATE', 'unknown', 'SK030', 'SK030', '{"details": "Created SK Official via bulk import: Lucia Gutierrez (SK Chairperson)", "ipAddress": "127.0.0.1", "userAgent": "Bulk Import"}', 'User Management', '2025-08-19 17:50:18.320034', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542776', 'LYDO001', 'admin', 'CREATE', 'unknown', 'SK031', 'SK031', '{"details": "Created SK Official via bulk import: Alejandro Sanchez (SK Secretary)", "ipAddress": "127.0.0.1", "userAgent": "Bulk Import"}', 'User Management', '2025-08-19 17:50:19.169427', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542777', 'LYDO001', 'admin', 'BULK_IMPORT', 'unknown', 'bulk-1755625819237', 'bulk-1755625819237', '{"details": "Bulk imported 12 SK Officials from sk-officials-sample-data.xlsx (15 total rows, 3 errors)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Management', '2025-08-19 17:50:19.287755', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542778', 'LYDO001', 'admin', 'CREATE', 'unknown', 'SK032', 'SK032', '{"details": "Created SK Official via bulk import: Martina Diaz (SK Treasurer)", "ipAddress": "127.0.0.1", "userAgent": "Bulk Import"}', 'User Management', '2025-08-19 17:50:19.949827', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1755620542779', 'LYDO001', 'admin', 'BULK_IMPORT', 'unknown', 'bulk-1755627689607', 'bulk-1755627689607', '{"details": "Bulk imported 0 SK Officials from sk-officials-template.xlsx (2 total rows, 2 errors)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Management', '2025-08-19 18:21:29.661844', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478608', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-25T05:07:58.608Z"}', 'Authentication', '2025-08-25 05:07:58.985065', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478609', 'LYDO001', 'admin', 'COMPLETE', 'unknown', 'TRM002', 'TRM002', '{"details": "Completed SK Term: 2025-2027 Term", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-25 07:10:00.004358', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478610', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK001', 'SK001', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:00.084955', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478611', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK003', 'SK003', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:00.164131', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478612', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK016', 'SK016', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:00.240401', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478613', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK009', 'SK009', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:00.317052', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478614', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK002', 'SK002', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:00.39675', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478615', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK017', 'SK017', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:00.474428', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478616', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK018', 'SK018', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:00.547505', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478617', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK019', 'SK019', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:00.672677', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478618', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK020', 'SK020', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:00.753578', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478619', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'TRM002', 'TRM002', '{"details": "Activated SK Term: 2025-2027 Term", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-25 07:10:45.870617', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478620', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK001', 'SK001', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:46.593347', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478621', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK003', 'SK003', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:46.722211', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478622', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK016', 'SK016', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:46.987342', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478623', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK009', 'SK009', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:47.088941', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478624', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK002', 'SK002', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:47.289193', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478625', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK017', 'SK017', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:47.49105', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478626', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK018', 'SK018', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:47.688323', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478627', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK019', 'SK019', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:47.788157', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478628', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK020', 'SK020', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:10:47.923658', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478629', 'LYDO001', 'admin', 'COMPLETE', 'unknown', 'TRM002', 'TRM002', '{"details": "Completed SK Term: 2025-2027 Term", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-25 07:45:31.171386', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478630', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK001', 'SK001', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:45:31.285199', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478631', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK003', 'SK003', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:45:31.371328', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478632', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK016', 'SK016', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:45:31.466872', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478633', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK009', 'SK009', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:45:31.553656', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478634', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK002', 'SK002', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:45:31.629138', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478635', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK017', 'SK017', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:45:31.704106', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478636', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK018', 'SK018', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:45:31.777215', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478637', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK019', 'SK019', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:45:31.858366', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478638', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK020', 'SK020', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:45:31.936341', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478639', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'TRM002', 'TRM002', '{"details": "Activated SK Term: 2025-2027 Term", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-25 07:48:46.987202', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478640', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK001', 'SK001', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:48:47.133703', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356539', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK002', 'SK002', '{"details": "Account access disabled for Sofia Cruz due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-31 06:56:12.563071', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478641', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK003', 'SK003', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:48:47.221801', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478642', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK016', 'SK016', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:48:47.300176', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478643', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK009', 'SK009', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:48:47.377468', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478644', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK002', 'SK002', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:48:47.454113', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478645', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK017', 'SK017', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:48:47.527714', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478646', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK018', 'SK018', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:48:47.605497', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478647', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK019', 'SK019', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:48:47.7151', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756098478648', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK020', 'SK020', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-25 07:48:47.786832', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756115541805', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-25T09:52:21.805Z"}', 'Authentication', '2025-08-25 09:52:22.188024', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756203360757', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-26T10:16:00.757Z"}', 'Authentication', '2025-08-26 10:16:02.56577', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756203360758', 'LYDO001', 'admin', 'EXPORT', 'unknown', 'bulk', 'bulk', '{"details": "Exported 9 SK Officials in PDF format (by-term, termId: TRM002, style: official)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-26 10:41:16.244359', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529516', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-26T12:15:29.516Z"}', 'Authentication', '2025-08-26 12:15:31.367569', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529517', 'LYDO001', 'admin', 'EXPORT', 'unknown', 'bulk', 'bulk', '{"details": "Exported 9 SK Officials in PDF format (by-term, termId: TRM002, style: official)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-26 12:15:50.170354', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529518', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (9 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 12:16:08.617906', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529519', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (9 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 12:19:26.83569', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529520', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (9 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 12:20:20.92734', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529521', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (9 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 12:21:54.13441', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529522', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (9 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 12:23:03.720559', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529523', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (3 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 12:23:19.706317', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529524', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (9 records)", "ipAddress": "::ffff:127.0.0.1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 12:26:30.716359', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529525', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (3 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 12:27:05.874387', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529526', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (9 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 14:05:51.337201', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529527', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (9 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 14:06:45.789517', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529528', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (9 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 14:07:21.520139', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529529', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (9 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 14:07:42.045913', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529530', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (3 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 14:09:23.216674', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529531', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (9 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 14:11:50.307236', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529532', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (9 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 14:15:36.467978', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529533', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (3 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 14:15:44.37476', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529534', 'LYDO001', 'admin', 'EXPORT', 'unknown', 'bulk', 'bulk', '{"details": "Exported 9 SK Officials in PDF format (by-term, termId: TRM002, style: official)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-26 14:16:12.481757', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529535', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (9 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 14:42:51.289354', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529536', 'LYDO001', 'admin', 'CREATE', 'unknown', 'Term Detailed Export', 'Term Detailed Export', '{"details": "Created Report: Term Detailed Export (9 records)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 14:43:43.404362', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529537', 'LYDO001', 'admin', 'EXPORT', 'unknown', 'bulk', 'bulk', '{"details": "Exported 12 Staff Members in PDF format (all export - status: all, style: table): Roberto Aquino (LYDO006), Tryyy carandang (LYDO012), Juan Cruz (LYDO002), John Doe (LYDO008), Maria Garcia (LYDO010) and 7 more", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-26 14:44:26.253281', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529538', 'LYDO001', 'admin', 'EXPORT', 'reports', 'bulk', 'bulk', '{"details": "Exported 9 records in JSON format", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-26 15:07:00.822348', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529539', 'LYDO001', 'admin', 'EXPORT', 'reports', 'bulk', 'bulk', '{"details": "Exported 9 records in JSON format", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-26 15:49:46.909363', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529540', 'LYDO001', 'admin', 'EXPORT', 'reports', 'bulk', 'bulk', '{"details": "Exported 9 records in JSON format", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-26 16:01:08.36984', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529541', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'TRM002', 'TRM002', '{"details": "Activated SK Term: 2025-2027 Term", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 18:02:10.879331', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529542', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK001', 'SK001', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:02:10.984345', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529543', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK003', 'SK003', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:02:11.122114', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529544', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK016', 'SK016', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:02:11.364479', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529545', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK009', 'SK009', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:02:11.769778', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529546', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK002', 'SK002', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:02:11.87552', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529547', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK017', 'SK017', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:02:12.033625', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529548', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK018', 'SK018', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:02:12.283561', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529549', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK019', 'SK019', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:02:12.390334', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529550', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK020', 'SK020', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:02:12.688337', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529551', 'LYDO001', 'admin', 'COMPLETE', 'unknown', 'TRM002', 'TRM002', '{"details": "Completed SK Term: 2025-2027 Term", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 18:54:29.125612', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529552', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK001', 'SK001', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:29.36411', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529553', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK003', 'SK003', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:29.529767', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529554', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK016', 'SK016', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:29.625482', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529555', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK009', 'SK009', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:29.831395', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529556', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK002', 'SK002', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:29.922361', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529557', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK017', 'SK017', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:30.188861', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529558', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK018', 'SK018', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:30.364568', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529559', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK019', 'SK019', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:30.476434', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529560', 'LYDO001', 'admin', 'DEACTIVATE', 'unknown', 'SK020', 'SK020', '{"details": "Deactivated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:30.564276', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529561', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'TRM002', 'TRM002', '{"details": "Activated SK Term: 2025-2027 Term", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 18:54:52.371068', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529562', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK001', 'SK001', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:52.798927', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529563', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK003', 'SK003', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:52.978541', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529564', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK016', 'SK016', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:53.063848', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529565', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK009', 'SK009', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:53.31296', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529566', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK002', 'SK002', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:53.438388', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529567', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK017', 'SK017', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:53.548657', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529568', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK018', 'SK018', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:53.644398', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356540', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK017', 'SK017', '{"details": "Account access disabled for Juan Dela Cruz due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-31 06:56:12.638429', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529569', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK019', 'SK019', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:53.819247', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529570', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK020', 'SK020', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-26 18:54:54.141388', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529571', 'LYDO001', 'admin', 'UPDATE', 'unknown', 'TRM002', 'TRM002', '{"details": "Updated SK Term: 2025-2027 Term Updae", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 18:55:41.402805', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756210529572', 'LYDO001', 'admin', 'UPDATE', 'unknown', 'TRM002', 'TRM002', '{"details": "Updated SK Term: 2025-2027 Term Updae", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-26 18:55:59.207635', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756297642343', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-27T12:27:22.343Z"}', 'Authentication', '2025-08-27 12:27:23.130081', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756297642344', 'LYDO001', 'admin', 'EXPORT', 'reports', 'bulk', 'bulk', '{"details": "Exported 9 records in JSON format", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-27 12:27:42.115244', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756297642345', 'LYDO001', 'admin', 'EXPORT', 'reports', 'bulk', 'bulk', '{"details": "Exported 9 records in JSON format", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-27 12:28:11.854816', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756297642346', 'LYDO001', 'admin', 'EXPORT', 'reports', 'bulk', 'bulk', '{"details": "Exported 9 records in JSON format", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-27 13:24:51.13688', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756297642347', 'LYDO001', 'admin', 'EXPORT', 'reports', 'SJB001', 'SJB001', '{"details": "Exported 3 records in JSON format for barangay SJB001", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-27 15:53:03.694648', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756358945816', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-28T05:29:05.816Z"}', 'Authentication', '2025-08-28 05:29:07.277897', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756358945817', 'LYDO001', 'admin', 'EXPORT', 'reports', 'bulk', 'bulk', '{"details": "Exported 1 records in JSON format", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-28 07:19:08.638828', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756358945818', 'LYDO001', 'admin', 'UPDATE', 'unknown', 'SK018', 'SK018', '{"details": "Updated SK Official: Luisa Ramos (SK Treasurer)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-28 09:04:01.092878', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918897', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-28T15:28:38.897Z"}', 'Authentication', '2025-08-28 15:28:40.523572', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918898', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK001', 'SK001', '{"details": "Account access disabled for Miguel Santos due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-28 16:11:06.050404', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918899', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK003', 'SK003', '{"details": "Account access disabled for Luis Mendoza due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-28 16:11:06.251275', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918900', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK016', 'SK016', '{"details": "Account access disabled for try trydjkSDkjfzxfxffsfa due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-28 16:11:06.457191', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918901', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK009', 'SK009', '{"details": "Account access disabled for use email due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-28 16:11:06.661252', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918902', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK002', 'SK002', '{"details": "Account access disabled for Sofia Cruz due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-28 16:11:06.86537', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918903', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK017', 'SK017', '{"details": "Account access disabled for Juan Dela Cruz due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-28 16:11:07.071474', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918904', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK018', 'SK018', '{"details": "Account access disabled for Luisa Ramos due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-28 16:11:07.275244', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918905', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK019', 'SK019', '{"details": "Account access disabled for Paolo Garcia due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-28 16:11:07.479258', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918906', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK020', 'SK020', '{"details": "Account access disabled for Jasmine Tan due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-28 16:11:07.71315', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918907', NULL, 'admin', 'TERM_COMPLETED', 'unknown', 'TRM002', 'TRM002', '{"details": "Completed term \"2025-2027 Term Updae\" automatically", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-28 16:11:07.830474', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918908', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'TRM002', 'TRM002', '{"details": "Activated SK Term: 2025-2027 Term Updae", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-28 16:11:42.873642', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918909', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK001', 'SK001', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-28 16:11:43.059347', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918910', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK003', 'SK003', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-28 16:11:43.322374', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356541', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK018', 'SK018', '{"details": "Account access disabled for Luisa Ramos due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-31 06:56:12.720938', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918911', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK016', 'SK016', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-28 16:11:43.409909', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918912', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK009', 'SK009', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-28 16:11:43.567194', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918913', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK002', 'SK002', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-28 16:11:43.647196', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918914', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK017', 'SK017', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-28 16:11:43.935597', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918915', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK018', 'SK018', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-28 16:11:44.167206', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918916', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK019', 'SK019', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-28 16:11:44.269007', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756394918917', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK020', 'SK020', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-28 16:11:44.38501', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756399052001', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-28T16:37:32.001Z"}', 'Authentication', '2025-08-28 16:37:32.078356', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756399052002', 'LYDO001', 'admin', 'EXPORT', 'reports', 'bulk', 'bulk', '{"details": "Exported 9 records in JSON format", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-29 06:32:10.907483', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756399052003', 'LYDO001', 'admin', 'EXPORT', 'reports', 'bulk', 'bulk', '{"details": "Exported 9 records in JSON format", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-29 06:32:20.037989', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756399052004', 'LYDO001', 'admin', 'EXPORT', 'reports', 'bulk', 'bulk', '{"details": "Exported 9 records in JSON format", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-29 06:40:12.64418', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756399052005', 'LYDO001', 'admin', 'EXPORT', 'unknown', 'bulk', 'bulk', '{"details": "Exported 12 Staff Members in PDF format (all export - status: all, style: official): Roberto Aquino (LYDO006), Tryyy carandang (LYDO012), Juan Cruz (LYDO002), John Doe (LYDO008), Maria Garcia (LYDO010) and 7 more", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-29 06:42:24.325344', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756399052006', 'LYDO001', 'admin', 'EXPORT', 'unknown', 'bulk', 'bulk', '{"details": "Exported 9 SK Officials in PDF format (by-term, termId: TRM002, style: official)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-29 06:42:48.972443', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756399052007', 'LYDO001', 'admin', 'EXPORT', 'reports', 'bulk', 'bulk', '{"details": "Exported 9 records in JSON format", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-29 06:44:26.58781', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756451810988', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-29T07:16:50.988Z"}', 'Authentication', '2025-08-29 07:16:51.169491', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756451892227', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-29T07:18:12.227Z"}', 'Authentication', '2025-08-29 07:18:12.407164', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756451921943', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-29T07:18:41.943Z"}', 'Authentication', '2025-08-29 07:18:42.125619', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756452215970', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-29T07:23:35.970Z"}', 'Authentication', '2025-08-29 07:23:36.149514', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756452215971', 'LYDO001', 'admin', 'CREATE', 'unknown', 'LYDO013', 'LYDO013', '{"details": "Created Staff Member: Try carandang (ROL002) with email honmebellecarandang@gmail.com", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-29 07:53:29.318067', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756452215972', 'LYDO001', 'admin', 'EXPORT', 'reports', 'bulk', 'bulk', '{"details": "Exported 9 records in JSON format", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-29 11:14:46.893548', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756478247224', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-29T14:37:27.224Z"}', 'Authentication', '2025-08-29 14:37:28.584388', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356534', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-30T16:12:36.534Z"}', 'Authentication', '2025-08-30 16:12:36.283844', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356535', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK001', 'SK001', '{"details": "Account access disabled for Miguel Santos due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-31 06:56:12.237251', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356536', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK003', 'SK003', '{"details": "Account access disabled for Luis Mendoza due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-31 06:56:12.311896', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356537', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK016', 'SK016', '{"details": "Account access disabled for try trydjkSDkjfzxfxffsfa due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-31 06:56:12.38931', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356538', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK009', 'SK009', '{"details": "Account access disabled for use email due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-31 06:56:12.474356', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356542', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK019', 'SK019', '{"details": "Account access disabled for Paolo Garcia due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-31 06:56:12.793224', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356543', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK020', 'SK020', '{"details": "Account access disabled for Jasmine Tan due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-31 06:56:12.870884', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356544', NULL, 'admin', 'TERM_COMPLETED', 'unknown', 'TRM002', 'TRM002', '{"details": "Completed term \"2025-2027 Term Updae\" automatically", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-08-31 06:56:12.944862', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356545', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'TRM002', 'TRM002', '{"details": "Activated SK Term: 2025-2027 Term Updae", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-08-31 06:56:35.523742', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356546', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK001', 'SK001', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-31 06:56:35.623901', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356547', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK003', 'SK003', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-31 06:56:35.747109', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356548', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK016', 'SK016', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-31 06:56:35.84045', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356549', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK009', 'SK009', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-31 06:56:35.918909', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356550', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK002', 'SK002', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-31 06:56:35.991347', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356551', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK017', 'SK017', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-31 06:56:36.068942', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356552', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK018', 'SK018', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-31 06:56:36.144927', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356553', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK019', 'SK019', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-31 06:56:36.232645', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356554', 'LYDO001', 'admin', 'ACTIVATE', 'unknown', 'SK020', 'SK020', '{"details": "Activated SK Official: undefined undefined (undefined)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'User Management', '2025-08-31 06:56:36.344174', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756570356555', 'LYDO001', 'admin', 'EXPORT', 'reports', 'bulk', 'bulk', '{"details": "Exported 9 records in JSON format", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'Data Export', '2025-08-31 12:42:11.3537', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756662629843', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-31T17:50:29.843Z"}', 'Authentication', '2025-08-31 17:50:30.49734', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756666496978', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-31T18:54:56.978Z"}', 'Authentication', '2025-08-31 18:54:57.626841', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756666775460', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-31T18:59:35.461Z"}', 'Authentication', '2025-08-31 18:59:36.110087', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756666860691', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-31T19:01:00.691Z"}', 'Authentication', '2025-08-31 19:01:01.337575', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756667417030', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-08-31T19:10:17.030Z"}', 'Authentication', '2025-08-31 19:10:17.686345', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756823038350', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-09-02T14:23:58.350Z"}', 'Authentication', '2025-09-02 14:23:58.521488', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519975', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-09-03T14:41:59.976Z"}', 'Authentication', '2025-09-03 14:42:00.834049', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519976', 'LYDO001', 'admin', 'CREATE', 'unknown', 'SK021', 'SK021', '{"details": "Created SK Official: Tryyy carandanghkhkfdsfsdgghgkj (SK Treasurer)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/139.0.0.0"}', 'User Management', '2025-09-03 17:35:39.591373', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519977', 'LYDO001', NULL, 'CREATE_SURVEY_BATCH', 'unknown', 'BAT006', 'BAT006', '{"details": "Created survey batch: dfasdfdf", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 03:52:39.157335', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519978', 'LYDO001', NULL, 'CREATE_SURVEY_BATCH', 'unknown', 'BAT001', 'BAT001', '{"details": "Created survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 05:08:59.980543', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519979', 'LYDO001', NULL, 'CREATE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "Created survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 05:52:38.090141', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519980', 'LYDO001', NULL, 'CREATE_SURVEY_BATCH', 'unknown', 'BAT003', 'BAT003', '{"details": "Created survey batch: adassdasddfsf", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/139.0.0.0"}', 'System Management', '2025-09-04 06:04:14.353929', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519981', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK021', 'SK021', '{"details": "Account access disabled for Tryyy carandanghkhkfdsfsdgghgkj due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-09-04 06:41:41.741343', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519982', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK001', 'SK001', '{"details": "Account access disabled for Miguel Santos due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-09-04 06:41:42.411278', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519983', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK003', 'SK003', '{"details": "Account access disabled for Luis Mendoza due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-09-04 06:41:42.525396', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519984', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK016', 'SK016', '{"details": "Account access disabled for try trydjkSDkjfzxfxffsfa due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-09-04 06:41:42.66123', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519985', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK009', 'SK009', '{"details": "Account access disabled for use email due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-09-04 06:41:42.804161', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519986', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK002', 'SK002', '{"details": "Account access disabled for Sofia Cruz due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-09-04 06:41:43.215195', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519987', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK017', 'SK017', '{"details": "Account access disabled for Juan Dela Cruz due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-09-04 06:41:43.347426', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519988', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK018', 'SK018', '{"details": "Account access disabled for Luisa Ramos due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-09-04 06:41:43.499201', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519989', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK019', 'SK019', '{"details": "Account access disabled for Paolo Garcia due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-09-04 06:41:44.525552', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519990', NULL, 'admin', 'ACCOUNT_ACCESS_DISABLED', 'unknown', 'SK020', 'SK020', '{"details": "Account access disabled for Jasmine Tan due to term completion", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-09-04 06:41:44.647304', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756910519991', NULL, 'admin', 'TERM_COMPLETED', 'unknown', 'TRM002', 'TRM002', '{"details": "Completed term \"2025-2027 Term Updae\" automatically", "ipAddress": null, "userAgent": "SYSTEM"}', 'System Management', '2025-09-04 06:41:45.058534', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756969034439', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-09-04T06:57:14.439Z"}', 'Authentication', '2025-09-04 06:57:15.659164', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756969525339', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-09-04T07:05:25.339Z"}', 'Authentication', '2025-09-04 07:05:26.55701', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256509', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-09-04T07:17:36.509Z"}', 'Authentication', '2025-09-04 07:17:37.730061', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256510', 'LYDO001', NULL, 'ACTIVATE_SURVEY_BATCH', 'unknown', 'BAT003', 'BAT003', '{"details": "activate survey batch: adassdasddfsf", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/139.0.0.0"}', 'System Management', '2025-09-04 07:56:15.139262', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256511', 'LYDO001', NULL, 'ACTIVATE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "activate survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/139.0.0.0"}', 'System Management', '2025-09-04 07:57:02.562188', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256512', 'LYDO001', NULL, 'ACTIVATE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "activate survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/139.0.0.0"}', 'System Management', '2025-09-04 08:14:57.556633', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256513', 'LYDO001', NULL, 'FORCE_ACTIVATE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "force-activate survey batch: adassdasd (Reason: try)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/139.0.0.0"}', 'System Management', '2025-09-04 08:18:41.347764', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256514', 'LYDO001', NULL, 'FORCE_ACTIVATE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "force-activate survey batch: adassdasd (Reason: try)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/139.0.0.0"}', 'System Management', '2025-09-04 08:21:37.170892', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256515', 'LYDO001', NULL, 'ACTIVATE_SURVEY_BATCH', 'unknown', 'BAT003', 'BAT003', '{"details": "activate survey batch: adassdasddfsf", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/139.0.0.0"}', 'System Management', '2025-09-04 08:25:47.619005', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256516', 'LYDO001', NULL, 'FORCE_ACTIVATE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "force-activate survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/139.0.0.0"}', 'System Management', '2025-09-04 08:38:18.513884', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256517', 'LYDO001', NULL, 'FORCE_ACTIVATE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "force-activate survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/139.0.0.0"}', 'System Management', '2025-09-04 08:42:17.817977', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256518', 'LYDO001', NULL, 'PAUSE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "pause survey batch: adassdasd (Reason: maintenance)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/139.0.0.0"}', 'System Management', '2025-09-04 09:12:10.238436', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256519', 'LYDO001', NULL, 'RESUME_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "resume survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/139.0.0.0"}', 'System Management', '2025-09-04 09:12:20.174601', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256520', 'LYDO001', NULL, 'PAUSE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "pause survey batch: adassdasd (Reason: maintenance)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 09:26:05.456865', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256521', 'LYDO001', NULL, 'RESUME_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "resume survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 09:26:09.58654', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256522', 'LYDO001', NULL, 'PAUSE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "pause survey batch: adassdasd (Reason: maintenance)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 09:28:48.224718', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256523', 'LYDO001', NULL, 'RESUME_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "resume survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 09:28:52.913781', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256524', 'LYDO001', NULL, 'PAUSE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "pause survey batch: adassdasd (Reason: maintenance)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 09:56:06.522491', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756970256525', 'LYDO001', NULL, 'RESUME_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "resume survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 09:56:10.021713', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830664', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-09-04T09:57:10.664Z"}', 'Authentication', '2025-09-04 09:57:11.884447', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830665', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH_STATUS', 'unknown', 'BAT002', 'BAT002', '{"details": "Updated survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/139.0.0.0"}', 'System Management', '2025-09-04 13:32:26.792351', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830666', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH', 'unknown', 'BAT003', 'BAT003', '{"details": "Updated survey batch: adassdasddfsffdgfdg", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 15:12:51.664212', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830667', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH', 'unknown', 'BAT001', 'BAT001', '{"details": "Updated survey batch: adassdasdfdfdfd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 15:13:19.1247', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830668', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "Updated survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 15:13:30.007533', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830669', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "Updated survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 15:17:43.437101', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830670', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "Updated survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 15:18:07.352194', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830671', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH_STATUS', 'unknown', 'BAT002', 'BAT002', '{"details": "Updated survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 15:28:52.75043', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830672', 'LYDO001', NULL, 'CREATE_SURVEY_BATCH', 'unknown', 'BAT004', 'BAT004', '{"details": "Created survey batch: adassdasdsgdfgsfg", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 15:42:04.193192', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830673', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "Updated survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 15:43:43.950279', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830674', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH_STATUS', 'unknown', 'BAT002', 'BAT002', '{"details": "Updated survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 15:45:28.29035', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830675', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "Updated survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 15:45:39.099794', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830676', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH_STATUS', 'unknown', 'BAT002', 'BAT002', '{"details": "Updated survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 15:46:33.788499', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830677', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH', 'unknown', 'BAT002', 'BAT002', '{"details": "Updated survey batch: adassdasd", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 15:46:48.947502', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830678', 'LYDO001', NULL, 'FORCE_CLOSE_SURVEY_BATCH', 'unknown', 'BAT003', 'BAT003', '{"details": "force-close survey batch: adassdasddfsffdgfdg (Reason: Auto-update: draft → closed based on date range)", "ipAddress": "::ffff:127.0.0.1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 16:26:24.380118', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830679', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH', 'unknown', 'BAT003', 'BAT003', '{"details": "Updated survey batch: adassdasddfsffdgfdg", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 16:27:04.403907', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830680', 'LYDO001', NULL, 'FORCE_CLOSE_SURVEY_BATCH', 'unknown', 'BAT003', 'BAT003', '{"details": "force-close survey batch: adassdasddfsffdgfdg (Reason: Auto-update: draft → closed based on date range)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 16:28:06.430933', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830681', 'LYDO001', NULL, 'CLOSE_SURVEY_BATCH', 'unknown', 'BAT004', 'BAT004', '{"details": "close survey batch: KK Survey 2024 Q2 (Reason: Auto-update: active → closed based on date range)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 16:30:15.943075', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830682', 'LYDO001', NULL, 'FORCE_CLOSE_SURVEY_BATCH', 'unknown', 'BAT005', 'BAT005', '{"details": "force-close survey batch: KK Survey 2024 Q3 (Reason: Auto-update: draft → closed based on date range)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 16:30:16.398812', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830683', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH', 'unknown', 'BAT006', 'BAT006', '{"details": "Updated survey batch: dfasdfdf", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 16:31:23.547412', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830684', 'LYDO001', NULL, 'ACTIVATE_SURVEY_BATCH', 'unknown', 'BAT006', 'BAT006', '{"details": "activate survey batch: dfasdfdf (Reason: Auto-update: draft → active based on date range)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-04 16:31:36.0714', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830685', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH', 'unknown', 'BAT006', 'BAT006', '{"details": "Updated survey batch: dfasdfdf", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-05 04:06:33.272341', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830686', 'LYDO001', NULL, 'PAUSE_SURVEY_BATCH', 'unknown', 'BAT006', 'BAT006', '{"details": "pause survey batch: dfasdfdf (Reason: maintenance)", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-05 04:06:39.598678', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1756979830687', 'LYDO001', NULL, 'RESUME_SURVEY_BATCH', 'unknown', 'BAT006', 'BAT006', '{"details": "resume survey batch: dfasdfdf", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-05 04:06:53.592951', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1757094835023', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-09-05T17:53:55.023Z"}', 'Authentication', '2025-09-05 17:53:55.427479', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1757094835024', 'LYDO001', NULL, 'UPDATE_SURVEY_BATCH', 'unknown', 'BAT006', 'BAT006', '{"details": "Updated survey batch: dfasdfdf", "ipAddress": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"}', 'System Management', '2025-09-05 18:10:02.969752', false, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1757177829831', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-09-06T16:57:09.831Z"}', 'Authentication', '2025-09-06 16:57:09.819169', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1757179303942', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-09-06T17:21:43.943Z"}', 'Authentication', '2025-09-06 17:21:43.940262', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1757180999558', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-09-06T17:49:59.558Z"}', 'Authentication', '2025-09-06 17:49:59.545321', true, NULL);
INSERT INTO public."Activity_Logs" VALUES ('ACT1757309564950', 'LYDO001', 'admin', 'login', 'authentication', NULL, NULL, '{"email": "admin@youthgovernance.com", "login_time": "2025-09-08T05:32:44.950Z"}', 'Authentication', '2025-09-08 05:32:44.969391', true, NULL);


--
-- TOC entry 3472 (class 0 OID 16599)
-- Dependencies: 229
-- Data for Name: Announcements; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Announcements" VALUES ('ANN001', 'Youth Leadership Summit 2024', 'Join us for the annual Youth Leadership Summit on May 15-17, 2024. This event will bring together young leaders from all 33 barangays of San Jose, Batangas to discuss youth empowerment, community development, and governance.', 'Annual youth leadership event for San Jose, Batangas', 'event', 'published', '/images/youth-summit-2024.jpg', 'summit-guidelines.pdf', '/attachments/summit-guidelines.pdf', true, true, '2024-04-01 09:00:00', 'USR001', '2024-04-01 09:00:00', '2025-08-10 08:20:57.890344');
INSERT INTO public."Announcements" VALUES ('ANN002', 'KK Survey Q2 2024 - Now Open!', 'The Katipunan ng Kabataan (KK) Survey for Q2 2024 is now open for all eligible youth aged 15-30. Your participation helps us understand youth needs and develop better programs.', 'Q2 2024 youth survey is now open for participation', 'survey', 'published', '/images/kk-survey-2024.jpg', NULL, NULL, false, true, '2024-04-01 10:00:00', 'USR001', '2024-04-01 10:00:00', '2025-08-10 08:20:57.890344');
INSERT INTO public."Announcements" VALUES ('ANN003', 'New Youth Programs Available', 'We are excited to announce new youth programs including skills training, entrepreneurship workshops, and sports activities. Check our website for details and registration.', 'New youth programs and activities available', 'update', 'published', NULL, 'youth-programs-2024.pdf', '/attachments/youth-programs-2024.pdf', false, false, '2024-04-02 11:00:00', 'USR001', '2024-04-02 11:00:00', '2025-08-10 08:20:57.890344');
INSERT INTO public."Announcements" VALUES ('ANN004', 'SK Officials Monthly Meeting', 'Monthly meeting for all SK Officials scheduled for April 25, 2024 at 2:00 PM. Agenda includes Q2 survey results and upcoming youth programs.', 'Monthly SK officials meeting on April 25', 'meeting', 'published', NULL, 'meeting-agenda.pdf', '/attachments/meeting-agenda.pdf', false, false, '2024-04-03 14:00:00', 'USR001', '2024-04-03 14:00:00', '2025-08-10 08:20:57.890344');
INSERT INTO public."Announcements" VALUES ('ANN005', 'Youth Achievers Recognition 2024', 'Congratulations to our outstanding youth achievers! We will recognize exceptional young leaders who have made significant contributions to their communities.', 'Recognition program for outstanding youth', 'achievement', 'published', '/images/youth-achievers-2024.jpg', NULL, NULL, false, false, '2024-04-04 16:00:00', 'USR001', '2024-04-04 16:00:00', '2025-08-10 08:20:57.890344');
INSERT INTO public."Announcements" VALUES ('ANN006', 'Upcoming Youth Festival', 'Planning for the annual youth festival is underway. This event will showcase youth talents and promote cultural awareness.', 'Annual youth festival planning in progress', 'event', 'draft', NULL, NULL, NULL, false, false, NULL, 'USR001', '2024-04-05 10:00:00', '2025-08-10 08:20:57.890344');
INSERT INTO public."Announcements" VALUES ('ANN009', 'Youth Leadership Summit 2024', 'Join us for the annual Youth Leadership Summit on May 15-17, 2024. This event will bring together young leaders from all 33 barangays of San Jose, Batangas to discuss youth empowerment, community development, and governance.', 'Annual youth leadership event for San Jose, Batangas', 'event', 'published', '/images/youth-summit-2024.jpg', 'summit-guidelines.pdf', '/attachments/summit-guidelines.pdf', true, false, '2024-04-01 09:00:00', 'USR001', '2024-04-01 09:00:00', '2025-08-10 08:20:58.27988');
INSERT INTO public."Announcements" VALUES ('ANN010', 'KK Survey Q2 2024 - Now Open!', 'The Katipunan ng Kabataan (KK) Survey for Q2 2024 is now open for all eligible youth aged 15-30. Your participation helps us understand youth needs and develop better programs.', 'Q2 2024 youth survey is now open for participation', 'survey', 'published', '/images/kk-survey-2024.jpg', NULL, NULL, false, true, '2024-04-01 10:00:00', 'USR001', '2024-04-01 10:00:00', '2025-08-10 08:20:58.27988');
INSERT INTO public."Announcements" VALUES ('ANN011', 'New Youth Programs Available', 'We are excited to announce new youth programs including skills training, entrepreneurship workshops, and sports activities. Check our website for details and registration.', 'New youth programs and activities available', 'update', 'published', NULL, 'youth-programs-2024.pdf', '/attachments/youth-programs-2024.pdf', false, false, '2024-04-02 11:00:00', 'USR001', '2024-04-02 11:00:00', '2025-08-10 08:20:58.27988');
INSERT INTO public."Announcements" VALUES ('ANN012', 'SK Officials Monthly Meeting', 'Monthly meeting for all SK Officials scheduled for April 25, 2024 at 2:00 PM. Agenda includes Q2 survey results and upcoming youth programs.', 'Monthly SK officials meeting on April 25', 'meeting', 'published', NULL, 'meeting-agenda.pdf', '/attachments/meeting-agenda.pdf', false, false, '2024-04-03 14:00:00', 'USR001', '2024-04-03 14:00:00', '2025-08-10 08:20:58.27988');
INSERT INTO public."Announcements" VALUES ('ANN013', 'Youth Achievers Recognition 2024', 'Congratulations to our outstanding youth achievers! We will recognize exceptional young leaders who have made significant contributions to their communities.', 'Recognition program for outstanding youth', 'achievement', 'published', '/images/youth-achievers-2024.jpg', NULL, NULL, false, false, '2024-04-04 16:00:00', 'USR001', '2024-04-04 16:00:00', '2025-08-10 08:20:58.27988');
INSERT INTO public."Announcements" VALUES ('ANN014', 'Upcoming Youth Festival', 'Planning for the annual youth festival is underway. This event will showcase youth talents and promote cultural awareness.', 'Annual youth festival planning in progress', 'event', 'draft', NULL, NULL, NULL, false, false, NULL, 'USR001', '2024-04-05 10:00:00', '2025-08-10 08:20:58.27988');


--
-- TOC entry 3458 (class 0 OID 16399)
-- Dependencies: 215
-- Data for Name: Barangay; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Barangay" VALUES ('SJB001', 'Aguila', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB002', 'Anus', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB003', 'Aya', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB004', 'Bagong Pook', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB005', 'Balagtasin', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB006', 'Balagtasin I', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB007', 'Banaybanay I', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB008', 'Banaybanay II', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB009', 'Bigain I', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB010', 'Bigain II', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB011', 'Bigain South', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB012', 'Calansayan', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB013', 'Dagatan', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB014', 'Don Luis', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB015', 'Galamay-Amo', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB016', 'Lalayat', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB017', 'Lapolapo I', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB018', 'Lapolapo II', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB019', 'Lepute', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB020', 'Lumil', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB021', 'Mojon-Tampoy', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB022', 'Natunuan', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB023', 'Palanca', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB024', 'Pinagtung-ulan', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB025', 'Poblacion Barangay I', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB026', 'Poblacion Barangay II', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB027', 'Poblacion Barangay III', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB028', 'Poblacion Barangay IV', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB029', 'Sabang', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB030', 'Salaban', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB031', 'Santo Cristo', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB032', 'Taysan', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');
INSERT INTO public."Barangay" VALUES ('SJB033', 'Tugtug', '2025-08-10 08:20:57.185662', '2025-08-10 08:20:57.185662');


--
-- TOC entry 3467 (class 0 OID 16523)
-- Dependencies: 224
-- Data for Name: KK_Survey_Batches; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."KK_Survey_Batches" VALUES ('BAT006', 'dfasdfdf', 'gdfgd', '2025-09-04', '2025-10-04', 'active', 15, 30, 'LYDO001', '2025-09-04 03:52:38.074', '2025-09-05 18:10:02.642419', 0, NULL, 'LYDO001', NULL, '2025-09-05 04:06:53.01661', 'LYDO001');
INSERT INTO public."KK_Survey_Batches" VALUES ('BAT001', 'KK Survey 2023 Q1', 'First quarter youth survey for 2023', '2023-01-01', '2023-03-31', 'closed', 15, 30, 'LYDO001', '2025-08-10 08:20:57.637', '2025-08-10 08:20:58.622', 5, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public."KK_Survey_Batches" VALUES ('BAT002', 'KK Survey 2023 Q2', 'Second quarter youth survey for 2023', '2023-04-01', '2023-06-30', 'closed', 15, 30, 'LYDO001', '2025-08-10 08:20:57.637', '2025-08-10 08:20:58.666', 2, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public."KK_Survey_Batches" VALUES ('BAT003', 'KK Survey 2024 Q1', 'First quarter youth survey for 2024', '2024-01-01', '2024-03-31', 'closed', 15, 30, 'LYDO001', '2025-08-10 08:20:57.637', '2025-08-10 08:20:58.717', 3, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public."KK_Survey_Batches" VALUES ('BAT004', 'KK Survey 2024 Q2', 'Second quarter youth survey for 2024 (Currently Active)', '2024-04-01', '2024-06-30', 'closed', 15, 30, 'LYDO001', '2025-08-10 08:20:57.637', '2025-09-04 16:30:15.638815', 4, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public."KK_Survey_Batches" VALUES ('BAT005', 'KK Survey 2024 Q3', 'Third quarter youth survey for 2024 (Draft - No responses yet)', '2024-07-01', '2024-09-30', 'closed', 15, 30, 'LYDO001', '2025-08-10 08:20:57.637', '2025-09-04 16:30:16.108102', 0, NULL, NULL, NULL, NULL, NULL);


--
-- TOC entry 3468 (class 0 OID 16543)
-- Dependencies: 225
-- Data for Name: KK_Survey_Responses; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."KK_Survey_Responses" VALUES ('RES001', 'BAT001', 'YTH001', 'SJB001', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'High School Level', 'Not interested looking for a job', true, true, true, true, '3-4 Times', NULL, 'validated', 'final', 'SK001', '2023-02-15 10:30:00', 'All information verified', '2025-08-10 08:20:57.683477', '2025-08-10 08:20:57.683477');
INSERT INTO public."KK_Survey_Responses" VALUES ('RES002', 'BAT001', 'YTH002', 'SJB001', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'College Level', 'Not interested looking for a job', true, true, true, true, '5 and above', NULL, 'validated', 'final', 'SK001', '2023-02-16 14:20:00', 'Complete and accurate', '2025-08-10 08:20:57.683477', '2025-08-10 08:20:57.683477');
INSERT INTO public."KK_Survey_Responses" VALUES ('RES003', 'BAT001', 'YTH003', 'SJB001', 'Single', 'Working Youth', NULL, 'Core Youth (18-24 yrs old)', 'College Grad', 'Employed', true, true, false, false, NULL, 'Not interested to Attend', 'validated', 'final', 'SK001', '2023-02-17 09:15:00', 'Employment verified', '2025-08-10 08:20:57.683477', '2025-08-10 08:20:57.683477');
INSERT INTO public."KK_Survey_Responses" VALUES ('RES004', 'BAT001', 'YTH006', 'SJB002', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'High School Level', 'Not interested looking for a job', true, true, true, true, '1-2 Times', NULL, 'validated', 'final', 'SK002', '2023-02-18 11:45:00', 'Valid response', '2025-08-10 08:20:57.683477', '2025-08-10 08:20:57.683477');
INSERT INTO public."KK_Survey_Responses" VALUES ('RES005', 'BAT001', 'YTH007', 'SJB002', 'Single', 'Out of School Youth', NULL, 'Core Youth (18-24 yrs old)', 'High School Grad', 'Currently looking for a Job', true, true, false, false, NULL, 'There was no KK Assembly Meeting', 'validated', 'final', 'SK002', '2023-02-19 16:30:00', 'Job search status confirmed', '2025-08-10 08:20:57.683477', '2025-08-10 08:20:57.683477');
INSERT INTO public."KK_Survey_Responses" VALUES ('RES006', 'BAT002', 'YTH004', 'SJB001', 'Single', 'Working Youth', NULL, 'Young Adult (15-30 yrs old)', 'College Grad', 'Employed', true, true, true, true, '3-4 Times', NULL, 'validated', 'final', 'SK001', '2023-05-10 13:20:00', 'Employment verified', '2025-08-10 08:20:57.683477', '2025-08-10 08:20:57.683477');
INSERT INTO public."KK_Survey_Responses" VALUES ('RES007', 'BAT002', 'YTH008', 'SJB002', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'College Level', 'Not interested looking for a job', true, true, true, true, '5 and above', NULL, 'validated', 'final', 'SK002', '2023-05-11 10:15:00', 'Complete information', '2025-08-10 08:20:57.683477', '2025-08-10 08:20:57.683477');
INSERT INTO public."KK_Survey_Responses" VALUES ('RES008', 'BAT003', 'YTH005', 'SJB001', 'Single', 'Working Youth', NULL, 'Young Adult (15-30 yrs old)', 'College Grad', 'Self-Employed', true, true, true, true, '5 and above', NULL, 'validated', 'final', 'SK001', '2024-02-20 14:45:00', 'Self-employment verified', '2025-08-10 08:20:57.683477', '2025-08-10 08:20:57.683477');
INSERT INTO public."KK_Survey_Responses" VALUES ('RES009', 'BAT003', 'YTH009', 'SJB002', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'College Level', 'Not interested looking for a job', true, true, true, true, '3-4 Times', NULL, 'validated', 'final', 'SK002', '2024-02-21 11:30:00', 'Valid response', '2025-08-10 08:20:57.683477', '2025-08-10 08:20:57.683477');
INSERT INTO public."KK_Survey_Responses" VALUES ('RES010', 'BAT003', 'YTH011', 'SJB003', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'High School Level', 'Not interested looking for a job', true, true, true, true, '1-2 Times', NULL, 'validated', 'final', 'SK003', '2024-02-22 09:20:00', 'Complete information', '2025-08-10 08:20:57.683477', '2025-08-10 08:20:57.683477');
INSERT INTO public."KK_Survey_Responses" VALUES ('RES011', 'BAT004', 'YTH012', 'SJB003', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'College Level', 'Not interested looking for a job', true, true, true, true, '3-4 Times', NULL, 'validated', 'manual', 'SK003', '2024-04-15 15:30:00', 'Pending final review', '2025-08-10 08:20:57.683477', '2025-08-10 08:20:57.683477');
INSERT INTO public."KK_Survey_Responses" VALUES ('RES012', 'BAT004', 'YTH013', 'SJB003', 'Single', 'Working Youth', NULL, 'Core Youth (18-24 yrs old)', 'College Grad', 'Employed', true, true, false, false, NULL, 'Not interested to Attend', 'validated', 'manual', 'SK003', '2024-04-16 10:45:00', 'Employment verified', '2025-08-10 08:20:57.683477', '2025-08-10 08:20:57.683477');
INSERT INTO public."KK_Survey_Responses" VALUES ('RES013', 'BAT004', 'YTH014', 'SJB003', 'Single', 'Out of School Youth', NULL, 'Young Adult (15-30 yrs old)', 'High School Grad', 'Currently looking for a Job', true, true, false, false, NULL, 'There was no KK Assembly Meeting', 'pending', 'automatic', NULL, NULL, NULL, '2025-08-10 08:20:57.683477', '2025-08-10 08:20:57.683477');
INSERT INTO public."KK_Survey_Responses" VALUES ('RES014', 'BAT004', 'YTH015', 'SJB003', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'High School Level', 'Not interested looking for a job', true, true, true, true, '1-2 Times', NULL, 'pending', 'automatic', NULL, NULL, NULL, '2025-08-10 08:20:57.683477', '2025-08-10 08:20:57.683477');


--
-- TOC entry 3460 (class 0 OID 16420)
-- Dependencies: 217
-- Data for Name: LYDO; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."LYDO" VALUES ('TEST001', 'ROL001', 'admin@test.com', 'admin.test@email.com', '$2a$12$hHOGkZSwqE.zCEoEze8oBuyQoJj8JbQZOH0GKrHE5JxDQk5NVse5C', 'Test', 'Admin', '', '', NULL, true, true, 'LYDO001', '2025-08-10 08:21:54.925791', '2025-08-15 13:44:58.278091', false, NULL);
INSERT INTO public."LYDO" VALUES ('LYDO006', 'ROL002', 'staff5@youthgovernance.com', 'staff5.personal@email.com', '$2a$12$hHOGkZSwqE.zCEoEze8oBuyQoJj8JbQZOH0GKrHE5JxDQk5NVse5C', 'Roberto', 'Aquino', 'Fernandez', 'Sr.', NULL, true, true, 'LYDO001', '2025-08-10 08:20:57.231704', '2025-08-19 19:47:45.763633', false, NULL);
INSERT INTO public."LYDO" VALUES ('LYDO012', 'ROL002', 'tryyy.carandang@lydo.gov.ph', 'trydasdasd0099@gmail.com', '$2a$10$.Rz7PwR4zQ6nzJQp7Ck66.eDjvljJ/TY6ruafumikUolpyUi/RPXm', 'Tryyy', 'carandang', NULL, NULL, NULL, true, false, 'LYDO001', '2025-08-19 17:04:34.654805', '2025-08-19 19:47:45.763633', false, NULL);
INSERT INTO public."LYDO" VALUES ('LYDO002', 'ROL002', 'staff1@youthgovernance.com', 'staff1.personal@email.com', '$2a$12$hHOGkZSwqE.zCEoEze8oBuyQoJj8JbQZOH0GKrHE5JxDQk5NVse5C', 'Juan', 'Cruz', 'Dela', 'Jr.', NULL, false, true, 'LYDO001', '2025-08-10 08:20:57.231704', '2025-08-19 19:41:49.210972', true, '2025-08-19 19:41:49.210972');
INSERT INTO public."LYDO" VALUES ('LYDO008', 'ROL002', 'john.doe@lydo.gov.ph', 'john.doe@personal.com', '$2a$10$7sNjGX8i59jFo3NicTkk3ubx8U2jBmAJWiJXuEweskhWu0VS53h1q', 'John', 'Doe', 'Michael', 'Jr.', NULL, false, false, 'LYDO001', '2025-08-18 14:14:10.518924', '2025-08-19 19:41:49.210972', true, '2025-08-19 19:41:49.210972');
INSERT INTO public."LYDO" VALUES ('LYDO010', 'ROL002', 'maria.garcia@lydo.gov.ph', 'maria.garcia@personal.com', '$2a$10$IZn.h4JrzdajM/QUF5wOhew30OHd1fJyA4th6gfSaZyPakNcAhWXC', 'Maria', 'Garcia', 'Santos', NULL, NULL, false, false, 'LYDO001', '2025-08-18 14:14:11.363699', '2025-08-19 19:43:47.989812', true, '2025-08-19 19:43:47.989812');
INSERT INTO public."LYDO" VALUES ('LYDO004', 'ROL002', 'staff3@youthgovernance.com', 'staff3.personal@email.com', '$2a$12$hHOGkZSwqE.zCEoEze8oBuyQoJj8JbQZOH0GKrHE5JxDQk5NVse5C', 'Pedro', 'Mendoza', 'Lopez', 'III', NULL, false, true, 'LYDO001', '2025-08-10 08:20:57.231704', '2025-08-19 19:43:47.989812', true, '2025-08-19 19:43:47.989812');
INSERT INTO public."LYDO" VALUES ('LYDO011', 'ROL002', 'carlos.mendoza@lydo.gov.ph', 'carlos.mendoza@personal.com', '$2a$10$z9/zeWCn22QwV8xer/CO1u7l45bvi9x.ggr0ivE8Vny7DQ6Kjkhiq', 'Carlos', 'Mendoza', 'Jr.', 'III', NULL, false, false, 'LYDO001', '2025-08-18 14:14:11.79826', '2025-08-19 19:47:27.747963', true, '2025-08-19 19:47:27.747963');
INSERT INTO public."LYDO" VALUES ('LYDO003', 'ROL002', 'staff2@youthgovernance.com', 'staff2.personal@email.com', '$2a$12$hHOGkZSwqE.zCEoEze8oBuyQoJj8JbQZOH0GKrHE5JxDQk5NVse5C', 'Ana', 'Reyes', 'Santos', '', NULL, false, true, 'LYDO001', '2025-08-10 08:20:57.231704', '2025-08-19 19:47:27.747963', true, '2025-08-19 19:47:27.747963');
INSERT INTO public."LYDO" VALUES ('LYDO007', 'ROL002', 'user.tester@lydo.gov.ph', 'test.user@example.com', '$2a$10$O4KUCgo2sF7IwJklFN1h1eWjGcDZFZcg1USTvI3tf0l4G0LG47z1m', 'User', 'Tester', NULL, NULL, NULL, true, false, 'LYDO001', '2025-08-13 08:16:45.161207', '2025-08-13 08:16:45.161207', false, NULL);
INSERT INTO public."LYDO" VALUES ('LYDO013', 'ROL002', 'try.carandang@lydo.gov.ph', 'honmebellecarandang@gmail.com', '$2a$10$vOAXTYxEDdbUYSRdLXODKeX12FLjkQtOxv.ZEJZLj.oaOpcyD5vSe', 'Try', 'carandang', NULL, NULL, NULL, true, false, NULL, '2025-08-29 07:53:28.253925', '2025-08-29 07:53:28.253925', false, NULL);
INSERT INTO public."LYDO" VALUES ('LYDO001', 'ROL001', 'admin@youthgovernance.com', 'admin.personal@email.com', '$2a$12$hHOGkZSwqE.zCEoEze8oBuyQoJj8JbQZOH0GKrHE5JxDQk5NVse5C', 'Maria', 'Santos', 'Garcia', 'Dr.', NULL, true, true, 'LYDO001', '2025-08-10 08:20:57.231704', '2025-08-13 16:39:34.60836', false, NULL);
INSERT INTO public."LYDO" VALUES ('TEST003', 'ROL002', 'staff@test.com', 'staff.test@email.com', '$2a$12$hHOGkZSwqE.zCEoEze8oBuyQoJj8JbQZOH0GKrHE5JxDQk5NVse5C', 'Test', 'Staff', '', '', NULL, true, true, 'LYDO001', '2025-08-10 08:21:55.118372', '2025-08-13 16:40:44.364355', false, NULL);
INSERT INTO public."LYDO" VALUES ('LYDO005', 'ROL002', 'staff4@youthgovernance.com', 'staff4.personal@email.com', '$2a$12$hHOGkZSwqE.zCEoEze8oBuyQoJj8JbQZOH0GKrHE5JxDQk5NVse5C', 'Carmen', 'Villanueva', 'Torres', '', NULL, false, true, 'LYDO001', '2025-08-10 08:20:57.231704', '2025-08-15 05:15:39.657489', true, '2025-08-15 05:15:39.657489');
INSERT INTO public."LYDO" VALUES ('LYDO009', 'ROL002', 'jane.smith@lydo.gov.ph', 'jane.smith@personal.com', '$2a$10$9.E9OGIg2zhHqUhNUWG2.uMG9SJaQ7Eh1I/g/w5arIp.Mv3PbGySy', 'Jane', 'Smith', NULL, 'Dr.', NULL, true, false, 'LYDO001', '2025-08-18 14:14:10.966585', '2025-08-18 14:14:10.966585', false, NULL);


--
-- TOC entry 3471 (class 0 OID 16585)
-- Dependencies: 228
-- Data for Name: Notifications; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Notifications" VALUES ('NOT001', 'USR007', 'sk_official', NULL, 'New Survey Response', 'You have a new survey response to validate from Barangay Aguila', 'validation_needed', 'normal', false, NULL, '2024-12-31 23:59:59', 'USR001', '2024-04-15 10:00:00');
INSERT INTO public."Notifications" VALUES ('NOT002', 'USR008', 'sk_official', NULL, 'Survey Reminder', 'Reminder: Complete validation of pending responses in your barangay', 'survey_reminder', 'normal', false, NULL, '2024-12-31 23:59:59', 'USR001', '2024-04-16 09:00:00');
INSERT INTO public."Notifications" VALUES ('NOT003', NULL, 'sk_official', 'SJB001', 'Barangay Meeting', 'SK meeting scheduled for Barangay Aguila on April 20, 2024', 'announcement', 'high', false, NULL, '2024-04-20 23:59:59', 'USR001', '2024-04-15 14:00:00');
INSERT INTO public."Notifications" VALUES ('NOT004', NULL, 'sk_official', 'SJB002', 'Validation Deadline', 'Survey validation deadline for Barangay Anus: April 25, 2024', 'error', 'urgent', false, NULL, '2024-04-25 23:59:59', 'USR001', '2024-04-16 11:00:00');
INSERT INTO public."Notifications" VALUES ('NOT005', NULL, 'lydo_staff', NULL, 'Monthly Report Due', 'Monthly youth survey report is due by April 30, 2024', 'error', 'high', false, NULL, '2024-04-30 23:59:59', 'USR001', '2024-04-17 08:00:00');
INSERT INTO public."Notifications" VALUES ('NOT006', NULL, 'youth', NULL, 'Survey Open', 'New KK Survey is now open for Q2 2024. Please participate!', 'survey_reminder', 'normal', false, NULL, '2024-06-30 23:59:59', 'USR001', '2024-04-18 10:00:00');
INSERT INTO public."Notifications" VALUES ('NOT007', NULL, 'all', NULL, 'System Maintenance', 'System will be under maintenance on April 22, 2024 from 2:00 AM to 4:00 AM', 'info', 'normal', false, NULL, '2024-04-22 04:00:00', 'USR001', '2024-04-19 15:00:00');
INSERT INTO public."Notifications" VALUES ('NOT008', 'USR009', 'sk_official', NULL, 'New Survey Response', 'You have a new survey response to validate from Barangay Aya', 'validation_needed', 'normal', false, NULL, '2024-12-31 23:59:59', 'USR001', '2024-04-17 10:00:00');
INSERT INTO public."Notifications" VALUES ('NOT009', 'USR010', 'sk_official', NULL, 'Survey Reminder', 'Reminder: Complete validation of pending responses in your barangay', 'survey_reminder', 'normal', false, NULL, '2024-12-31 23:59:59', 'USR001', '2024-04-18 09:00:00');
INSERT INTO public."Notifications" VALUES ('NOT010', NULL, 'sk_official', 'SJB003', 'Barangay Meeting', 'SK meeting scheduled for Barangay Aya on April 22, 2024', 'announcement', 'high', false, NULL, '2024-04-22 23:59:59', 'USR001', '2024-04-18 14:00:00');
INSERT INTO public."Notifications" VALUES ('NOT011', NULL, 'youth', NULL, 'Youth Month Registration', 'Registration for Youth Month 2024 events is now open. Secure your spot!', 'survey_reminder', 'normal', false, NULL, '2024-05-31 23:59:59', 'USR001', '2024-04-19 10:00:00');
INSERT INTO public."Notifications" VALUES ('NOT012', NULL, 'all', NULL, 'Youth Month 2024', 'Youth Month 2024 celebration starts June 1st. Join us for exciting events!', 'announcement', 'normal', false, NULL, '2024-06-30 23:59:59', 'USR001', '2024-04-20 15:00:00');
INSERT INTO public."Notifications" VALUES ('NOT020', 'USR001', 'admin', NULL, 'New Report Added', 'Report SK Officials PDF Export (6 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-20 15:24:38.295968');
INSERT INTO public."Notifications" VALUES ('NOT019', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report SK Officials PDF Export (6 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-20 15:24:38.297392');
INSERT INTO public."Notifications" VALUES ('NOT021', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Try carandang (SK Secretary) - SK014 has been activated by Maria Santos', 'success', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-20 15:25:04.517169');
INSERT INTO public."Notifications" VALUES ('NOT013', 'LYDO002', 'lydo_staff', NULL, 'Welcome to LYDO Youth Governance', 'Welcome Final Test! Your account has been created successfully.', 'info', 'low', false, NULL, NULL, 'SYSTEM_TEST', '2025-08-15 07:46:31.400242');
INSERT INTO public."Notifications" VALUES ('NOT016', 'LYDO013', 'lydo_staff', NULL, 'Welcome to LYDO Youth Governance', 'Welcome email try! Your account has been created successfully.', 'info', 'low', false, NULL, NULL, 'LYDO001', '2025-08-15 07:58:48.18509');
INSERT INTO public."Notifications" VALUES ('NOT022', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Try carandang (SK Secretary) - SK014 has been activated by Maria Santos', 'success', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-20 15:25:04.517671');
INSERT INTO public."Notifications" VALUES ('NOT023', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Try carandang (SK Chairperson) - SK012 has been activated by Maria Santos', 'success', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-20 17:48:55.240982');
INSERT INTO public."Notifications" VALUES ('NOT018', 'LYDO014', 'lydo_staff', NULL, 'Welcome to LYDO Youth Governance', 'Welcome Honnie carandang! Your account has been created successfully.', 'info', 'low', false, NULL, NULL, 'LYDO001', '2025-08-15 08:12:52.17354');
INSERT INTO public."Notifications" VALUES ('NOT024', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Try carandang (SK Chairperson) - SK012 has been activated by Maria Santos', 'success', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-20 17:48:55.241232');
INSERT INTO public."Notifications" VALUES ('NOT025', 'TESTUSER001', 'admin', NULL, 'Bulk SK Official Operation', 'Bulk deactivate operation completed by Maria Santos: 3 SK Officials processed', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-20 17:59:27.276976');
INSERT INTO public."Notifications" VALUES ('NOT026', 'USR001', 'admin', NULL, 'Bulk SK Official Operation', 'Bulk deactivate operation completed by Maria Santos: 3 SK Officials processed', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-20 17:59:27.279417');
INSERT INTO public."Notifications" VALUES ('NOT027', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report SK Officials PDF Export (31 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-20 17:59:34.317333');
INSERT INTO public."Notifications" VALUES ('NOT017', 'USR001', 'admin', NULL, 'Staff Management: test_debug', 'Staff member Debug Test User (LYDO999) - test_debug. Testing database notification storage', 'info', 'high', true, '2025-08-15 09:49:59.536514', NULL, 'LYDO001', '2025-08-15 08:09:51.989715');
INSERT INTO public."Notifications" VALUES ('NOT015', 'USR001', 'admin', NULL, 'Staff Management: create', 'Staff member Test User (LYDO999) - create. New staff member created. Welcome email with login credentials sent to test@email.com', 'info', 'high', true, '2025-08-15 09:50:01.80961', NULL, 'LYDO001', '2025-08-15 07:53:58.796025');
INSERT INTO public."Notifications" VALUES ('NOT014', 'USR001', 'admin', NULL, 'Staff Management: create', 'Staff member Test User (LYDO999) - create. New staff member created. Welcome email with login credentials sent to test@email.com', 'info', 'high', true, '2025-08-15 09:50:08.024866', NULL, 'LYDO001', '2025-08-15 07:52:27.172743');
INSERT INTO public."Notifications" VALUES ('NOT028', 'USR001', 'admin', NULL, 'New Report Added', 'Report SK Officials PDF Export (31 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-20 17:59:34.317121');
INSERT INTO public."Notifications" VALUES ('NOT029', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 2 records (2 errors)', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-20 18:00:49.072141');
INSERT INTO public."Notifications" VALUES ('NOT030', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 2 records (2 errors)', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-20 18:00:49.07261');
INSERT INTO public."Notifications" VALUES ('NOT031', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 2 records (2 errors)', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-20 18:00:49.768911');
INSERT INTO public."Notifications" VALUES ('NOT032', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 2 records (2 errors)', 'warning', 'normal', true, '2025-08-20 18:01:16.191498', NULL, 'SYSTEM', '2025-08-20 18:00:49.769347');
INSERT INTO public."Notifications" VALUES ('NOT033', 'USR065', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Try carandang! You have been assigned as SK Chairperson. Your organizational email is tcarandang.lalayat@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-20 18:32:23.285647');
INSERT INTO public."Notifications" VALUES ('NOT035', 'USR001', 'admin', NULL, 'New SK Official Added', 'SK Official Try carandang (SK Chairperson) - SK033 has been created by Maria Santos for Lalayat', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-20 18:32:23.356422');
INSERT INTO public."Notifications" VALUES ('NOT034', 'TESTUSER001', 'admin', NULL, 'New SK Official Added', 'SK Official Try carandang (SK Chairperson) - SK033 has been created by Maria Santos for Lalayat', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-20 18:32:23.354777');
INSERT INTO public."Notifications" VALUES ('NOT036', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Diego Aquino (SK Secretary) - SK005 has been activated by Maria Santos', 'success', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-20 18:44:07.071568');
INSERT INTO public."Notifications" VALUES ('NOT037', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Diego Aquino (SK Secretary) - SK005 has been activated by Maria Santos', 'success', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-20 18:44:07.073353');
INSERT INTO public."Notifications" VALUES ('NOT038', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Secretary) - SK002 has been deactivated by Maria Santos', 'warning', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-21 04:17:55.328983');
INSERT INTO public."Notifications" VALUES ('NOT039', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Secretary) - SK002 has been deactivated by Maria Santos', 'warning', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-21 04:17:55.329942');
INSERT INTO public."Notifications" VALUES ('NOT040', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Secretary) - SK002 has been activated by Maria Santos', 'success', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-21 06:42:45.683396');
INSERT INTO public."Notifications" VALUES ('NOT041', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Secretary) - SK002 has been activated by Maria Santos', 'success', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-21 06:42:45.683396');
INSERT INTO public."Notifications" VALUES ('NOT042', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 2 records (2 errors)', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:01:06.479095');
INSERT INTO public."Notifications" VALUES ('NOT043', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 2 records (2 errors)', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:01:06.479745');
INSERT INTO public."Notifications" VALUES ('NOT044', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 2 records (2 errors)', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:01:06.965446');
INSERT INTO public."Notifications" VALUES ('NOT045', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 2 records (2 errors)', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:01:06.970189');
INSERT INTO public."Notifications" VALUES ('NOT046', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Secretary) - SK002 has been deactivated by Maria Santos', 'warning', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-21 07:01:21.093779');
INSERT INTO public."Notifications" VALUES ('NOT047', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Secretary) - SK002 has been deactivated by Maria Santos', 'warning', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-21 07:01:21.096329');
INSERT INTO public."Notifications" VALUES ('NOT048', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 12 records (12 errors)', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:11:09.748547');
INSERT INTO public."Notifications" VALUES ('NOT049', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 12 records (12 errors)', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:11:09.749253');
INSERT INTO public."Notifications" VALUES ('NOT051', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 12 records (12 errors)', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:11:10.301937');
INSERT INTO public."Notifications" VALUES ('NOT050', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 12 records (12 errors)', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:11:10.305362');
INSERT INTO public."Notifications" VALUES ('NOT052', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 12 records (12 errors)', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:12:00.250749');
INSERT INTO public."Notifications" VALUES ('NOT053', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 12 records (12 errors)', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:12:00.25662');
INSERT INTO public."Notifications" VALUES ('NOT054', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 12 records (12 errors)', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:12:01.735731');
INSERT INTO public."Notifications" VALUES ('NOT055', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 0 SK Officials imported successfully out of 12 records (12 errors)', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:12:01.742903');
INSERT INTO public."Notifications" VALUES ('NOT056', 'USR027', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Juan Dela Cruz! You have been assigned as SK Secretary. Your organizational email is jdela.cruz.anus@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:15:59.196074');
INSERT INTO public."Notifications" VALUES ('NOT057', 'USR028', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Luisa Ramos! You have been assigned as SK Treasurer. Your organizational email is lramos.aguila@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:15:59.587803');
INSERT INTO public."Notifications" VALUES ('NOT058', 'USR029', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Paolo Garcia! You have been assigned as SK Councilor. Your organizational email is pgarcia.aguila@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:16:00.563972');
INSERT INTO public."Notifications" VALUES ('NOT060', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:16:02.594742');
INSERT INTO public."Notifications" VALUES ('NOT059', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:16:02.594676');
INSERT INTO public."Notifications" VALUES ('NOT061', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:16:02.597398');
INSERT INTO public."Notifications" VALUES ('NOT062', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:16:03.132865');
INSERT INTO public."Notifications" VALUES ('NOT063', 'USR030', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Jasmine Tan! You have been assigned as SK Councilor. Your organizational email is jtan.anus@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:16:03.299418');
INSERT INTO public."Notifications" VALUES ('NOT064', 'USR028', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Luisa Ramos! You have been assigned as SK Treasurer. Your organizational email is lramos.aguila@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:33:28.440137');
INSERT INTO public."Notifications" VALUES ('NOT065', 'USR027', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Juan Dela Cruz! You have been assigned as SK Secretary. Your organizational email is jdela.cruz.anus@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:33:28.460593');
INSERT INTO public."Notifications" VALUES ('NOT066', 'USR029', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Paolo Garcia! You have been assigned as SK Councilor. Your organizational email is pgarcia.aguila@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:33:30.362603');
INSERT INTO public."Notifications" VALUES ('NOT067', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:33:32.606753');
INSERT INTO public."Notifications" VALUES ('NOT068', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:33:32.607195');
INSERT INTO public."Notifications" VALUES ('NOT069', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:33:33.220976');
INSERT INTO public."Notifications" VALUES ('NOT070', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:33:33.225334');
INSERT INTO public."Notifications" VALUES ('NOT071', 'USR030', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Jasmine Tan! You have been assigned as SK Councilor. Your organizational email is jtan.anus@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:33:33.284947');
INSERT INTO public."Notifications" VALUES ('NOT072', 'USR027', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Juan Dela Cruz! You have been assigned as SK Secretary. Your organizational email is jdela.cruz.anus@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:39:45.339147');
INSERT INTO public."Notifications" VALUES ('NOT073', 'USR028', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Luisa Ramos! You have been assigned as SK Treasurer. Your organizational email is lramos.aguila@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:39:45.38736');
INSERT INTO public."Notifications" VALUES ('NOT074', 'USR029', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Paolo Garcia! You have been assigned as SK Councilor. Your organizational email is pgarcia.aguila@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:39:46.307722');
INSERT INTO public."Notifications" VALUES ('NOT075', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:39:48.48845');
INSERT INTO public."Notifications" VALUES ('NOT077', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:39:48.490434');
INSERT INTO public."Notifications" VALUES ('NOT076', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:39:48.999963');
INSERT INTO public."Notifications" VALUES ('NOT078', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:39:49.012516');
INSERT INTO public."Notifications" VALUES ('NOT079', 'USR030', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Jasmine Tan! You have been assigned as SK Councilor. Your organizational email is jtan.anus@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 07:39:49.18649');
INSERT INTO public."Notifications" VALUES ('NOT081', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Secretary) - SK002 has been activated by Maria Santos', 'success', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-21 07:43:27.70376');
INSERT INTO public."Notifications" VALUES ('NOT080', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Secretary) - SK002 has been activated by Maria Santos', 'success', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-21 07:43:27.704164');
INSERT INTO public."Notifications" VALUES ('NOT082', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Secretary) - SK002 has been deactivated by Maria Santos', 'warning', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-21 07:44:06.526586');
INSERT INTO public."Notifications" VALUES ('NOT083', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Secretary) - SK002 has been deactivated by Maria Santos', 'warning', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-21 07:44:06.528085');
INSERT INTO public."Notifications" VALUES ('NOT084', 'USR027', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Juan Dela Cruz! You have been assigned as SK Secretary. Your organizational email is jdela.cruz.anus@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 09:46:31.063519');
INSERT INTO public."Notifications" VALUES ('NOT085', 'USR028', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Luisa Ramos! You have been assigned as SK Treasurer. Your organizational email is lramos.aguila@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 09:46:34.145482');
INSERT INTO public."Notifications" VALUES ('NOT086', 'USR029', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Paolo Garcia! You have been assigned as SK Councilor. Your organizational email is pgarcia.aguila@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 09:46:34.228657');
INSERT INTO public."Notifications" VALUES ('NOT087', 'USR030', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Jasmine Tan! You have been assigned as SK Councilor. Your organizational email is jtan.anus@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 09:46:35.975593');
INSERT INTO public."Notifications" VALUES ('NOT088', 'USR027', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Juan Dela Cruz! You have been assigned as SK Secretary. Your organizational email is jdela.cruz.anus@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:06:03.18656');
INSERT INTO public."Notifications" VALUES ('NOT089', 'USR028', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Luisa Ramos! You have been assigned as SK Treasurer. Your organizational email is lramos.aguila@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:06:04.821634');
INSERT INTO public."Notifications" VALUES ('NOT090', 'USR029', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Paolo Garcia! You have been assigned as SK Councilor. Your organizational email is pgarcia.aguila@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:06:05.339649');
INSERT INTO public."Notifications" VALUES ('NOT091', 'USR030', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Jasmine Tan! You have been assigned as SK Councilor. Your organizational email is jtan.anus@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:06:10.599457');
INSERT INTO public."Notifications" VALUES ('NOT093', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:06:11.981081');
INSERT INTO public."Notifications" VALUES ('NOT092', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:06:11.981569');
INSERT INTO public."Notifications" VALUES ('NOT094', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:06:11.98668');
INSERT INTO public."Notifications" VALUES ('NOT095', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:06:11.987659');
INSERT INTO public."Notifications" VALUES ('NOT096', 'USR027', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Juan Dela Cruz! You have been assigned as SK Secretary. Your organizational email is jdela.cruz.anus@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:14:50.723749');
INSERT INTO public."Notifications" VALUES ('NOT097', 'USR028', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Luisa Ramos! You have been assigned as SK Treasurer. Your organizational email is lramos.aguila@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:14:50.997018');
INSERT INTO public."Notifications" VALUES ('NOT098', 'USR029', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Paolo Garcia! You have been assigned as SK Councilor. Your organizational email is pgarcia.aguila@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:14:51.962747');
INSERT INTO public."Notifications" VALUES ('NOT099', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:14:53.841343');
INSERT INTO public."Notifications" VALUES ('NOT101', 'TESTUSER001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:14:53.841694');
INSERT INTO public."Notifications" VALUES ('NOT100', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:14:54.448381');
INSERT INTO public."Notifications" VALUES ('NOT102', 'USR001', 'admin', NULL, 'SK Officials Bulk Import Completed', 'Bulk import completed by Maria Santos: 4 SK Officials imported successfully out of 12 records (8 errors)', 'success', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:14:54.47809');
INSERT INTO public."Notifications" VALUES ('NOT103', 'USR030', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Jasmine Tan! You have been assigned as SK Councilor. Your organizational email is jtan.anus@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-21 11:14:54.526156');
INSERT INTO public."Notifications" VALUES ('NOT104', 'TESTUSER001', 'admin', NULL, 'New SK Term Added', 'SK Term 2024-2025 (TRM004) has been created by Maria Santos. Duration: Mon Jan 22 2024 00:00:00 GMT+0800 (Philippine Standard Time) to Wed Jul 22 2026 00:00:00 GMT+0800 (Philippine Standard Time)', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-22 14:32:03.02948');
INSERT INTO public."Notifications" VALUES ('NOT106', 'TESTUSER001', 'admin', NULL, 'New SK Term Created', 'SK Term "2024-2025" (TRM004) has been created. Period: 1/22/2024 - 7/22/2026', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-22 14:32:03.553507');
INSERT INTO public."Notifications" VALUES ('NOT107', 'USR001', 'admin', NULL, 'New SK Term Created', 'SK Term "2024-2025" (TRM004) has been created. Period: 1/22/2024 - 7/22/2026', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-22 14:32:03.555234');
INSERT INTO public."Notifications" VALUES ('NOT105', 'USR001', 'admin', NULL, 'New SK Term Added', 'SK Term 2024-2025 (TRM004) has been created by Maria Santos. Duration: Mon Jan 22 2024 00:00:00 GMT+0800 (Philippine Standard Time) to Wed Jul 22 2026 00:00:00 GMT+0800 (Philippine Standard Time)', 'info', 'normal', true, '2025-08-22 14:51:13.86496', NULL, 'LYDO001', '2025-08-22 14:32:03.029819');
INSERT INTO public."Notifications" VALUES ('NOT109', 'USR001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2024-2025 (TRM004) has been activated by Maria Santos', 'success', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-22 17:27:53.31094');
INSERT INTO public."Notifications" VALUES ('NOT108', 'TESTUSER001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2024-2025 (TRM004) has been activated by Maria Santos', 'success', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-22 17:27:53.310776');
INSERT INTO public."Notifications" VALUES ('NOT111', 'USR001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2024-2025 (TRM004) has been completed by Maria Santos', 'warning', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-22 17:35:09.883229');
INSERT INTO public."Notifications" VALUES ('NOT110', 'TESTUSER001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2024-2025 (TRM004) has been completed by Maria Santos', 'warning', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-22 17:35:09.885134');
INSERT INTO public."Notifications" VALUES ('NOT112', 'TESTUSER001', 'admin', NULL, 'New SK Term Created', 'SK Term "2030-2031" (TRM005) has been created. Period: 1/24/2030 - 12/24/2031', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-23 17:39:02.017001');
INSERT INTO public."Notifications" VALUES ('NOT114', 'TESTUSER001', 'admin', NULL, 'New SK Term Added', 'SK Term 2030-2031 (TRM005) has been created by Maria Santos. Duration: Thu Jan 24 2030 00:00:00 GMT+0800 (Philippine Standard Time) to Wed Dec 24 2031 00:00:00 GMT+0800 (Philippine Standard Time)', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-23 17:39:02.017986');
INSERT INTO public."Notifications" VALUES ('NOT113', 'USR001', 'admin', NULL, 'New SK Term Created', 'SK Term "2030-2031" (TRM005) has been created. Period: 1/24/2030 - 12/24/2031', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-23 17:39:02.018067');
INSERT INTO public."Notifications" VALUES ('NOT115', 'USR001', 'admin', NULL, 'New SK Term Added', 'SK Term 2030-2031 (TRM005) has been created by Maria Santos. Duration: Thu Jan 24 2030 00:00:00 GMT+0800 (Philippine Standard Time) to Wed Dec 24 2031 00:00:00 GMT+0800 (Philippine Standard Time)', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-23 17:39:02.019656');
INSERT INTO public."Notifications" VALUES ('NOT116', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK019', '2025-08-24 15:16:15.973892');
INSERT INTO public."Notifications" VALUES ('NOT118', 'TESTUSER001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term (TRM002) has been completed by Admin User', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-24 15:16:15.991781');
INSERT INTO public."Notifications" VALUES ('NOT120', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK020', '2025-08-24 15:16:16.084651');
INSERT INTO public."Notifications" VALUES ('NOT121', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK020', '2025-08-24 15:16:16.093367');
INSERT INTO public."Notifications" VALUES ('NOT117', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK019', '2025-08-24 15:16:16.580996');
INSERT INTO public."Notifications" VALUES ('NOT119', 'USR001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term (TRM002) has been completed by Admin User', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-24 15:16:16.636936');
INSERT INTO public."Notifications" VALUES ('NOT122', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK003', '2025-08-24 15:16:16.987146');
INSERT INTO public."Notifications" VALUES ('NOT123', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK003', '2025-08-24 15:16:16.99134');
INSERT INTO public."Notifications" VALUES ('NOT126', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK016', '2025-08-24 15:16:17.187627');
INSERT INTO public."Notifications" VALUES ('NOT128', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK002', '2025-08-24 15:16:17.188902');
INSERT INTO public."Notifications" VALUES ('NOT124', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK001', '2025-08-24 15:16:17.187479');
INSERT INTO public."Notifications" VALUES ('NOT127', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK016', '2025-08-24 15:16:17.190348');
INSERT INTO public."Notifications" VALUES ('NOT125', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK001', '2025-08-24 15:16:17.190623');
INSERT INTO public."Notifications" VALUES ('NOT129', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK002', '2025-08-24 15:16:17.190557');
INSERT INTO public."Notifications" VALUES ('NOT130', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK009', '2025-08-24 15:16:17.234272');
INSERT INTO public."Notifications" VALUES ('NOT133', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK018', '2025-08-24 15:16:17.286971');
INSERT INTO public."Notifications" VALUES ('NOT132', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK018', '2025-08-24 15:16:17.286843');
INSERT INTO public."Notifications" VALUES ('NOT131', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK009', '2025-08-24 15:16:17.287546');
INSERT INTO public."Notifications" VALUES ('NOT135', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK017', '2025-08-24 15:16:17.400197');
INSERT INTO public."Notifications" VALUES ('NOT134', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official undefined undefined (undefined) - undefined has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK017', '2025-08-24 15:16:17.400137');
INSERT INTO public."Notifications" VALUES ('NOT136', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK001', '2025-08-24 17:32:22.172192');
INSERT INTO public."Notifications" VALUES ('NOT137', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK001', '2025-08-24 17:32:22.888265');
INSERT INTO public."Notifications" VALUES ('NOT138', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK009', '2025-08-24 17:32:23.488438');
INSERT INTO public."Notifications" VALUES ('NOT140', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK019', '2025-08-24 17:32:23.490185');
INSERT INTO public."Notifications" VALUES ('NOT139', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK009', '2025-08-24 17:32:23.490846');
INSERT INTO public."Notifications" VALUES ('NOT141', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK019', '2025-08-24 17:32:23.494771');
INSERT INTO public."Notifications" VALUES ('NOT142', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK016', '2025-08-24 17:32:23.53382');
INSERT INTO public."Notifications" VALUES ('NOT145', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK017', '2025-08-24 17:32:23.538857');
INSERT INTO public."Notifications" VALUES ('NOT143', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK016', '2025-08-24 17:32:23.587343');
INSERT INTO public."Notifications" VALUES ('NOT146', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK002', '2025-08-24 17:32:23.588419');
INSERT INTO public."Notifications" VALUES ('NOT144', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK017', '2025-08-24 17:32:23.589858');
INSERT INTO public."Notifications" VALUES ('NOT148', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK003', '2025-08-24 17:32:23.645693');
INSERT INTO public."Notifications" VALUES ('NOT151', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK020', '2025-08-24 17:32:23.688484');
INSERT INTO public."Notifications" VALUES ('NOT150', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK020', '2025-08-24 17:32:23.688558');
INSERT INTO public."Notifications" VALUES ('NOT149', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK003', '2025-08-24 17:32:23.689185');
INSERT INTO public."Notifications" VALUES ('NOT153', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK018', '2025-08-24 17:32:23.737809');
INSERT INTO public."Notifications" VALUES ('NOT152', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK018', '2025-08-24 17:32:23.740519');
INSERT INTO public."Notifications" VALUES ('NOT147', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK002', '2025-08-24 17:32:24.06547');
INSERT INTO public."Notifications" VALUES ('NOT154', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK001', '2025-08-25 07:10:00.156949');
INSERT INTO public."Notifications" VALUES ('NOT157', 'USR001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term (TRM002) has been completed by Admin User', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-25 07:10:00.881549');
INSERT INTO public."Notifications" VALUES ('NOT156', 'TESTUSER001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term (TRM002) has been completed by Admin User', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-25 07:10:00.880372');
INSERT INTO public."Notifications" VALUES ('NOT158', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK017', '2025-08-25 07:10:00.891397');
INSERT INTO public."Notifications" VALUES ('NOT159', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK017', '2025-08-25 07:10:00.892183');
INSERT INTO public."Notifications" VALUES ('NOT155', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK001', '2025-08-25 07:10:01.112088');
INSERT INTO public."Notifications" VALUES ('NOT161', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK018', '2025-08-25 07:10:01.327261');
INSERT INTO public."Notifications" VALUES ('NOT160', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK018', '2025-08-25 07:10:01.324924');
INSERT INTO public."Notifications" VALUES ('NOT162', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK002', '2025-08-25 07:10:01.478372');
INSERT INTO public."Notifications" VALUES ('NOT163', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK002', '2025-08-25 07:10:01.479948');
INSERT INTO public."Notifications" VALUES ('NOT165', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK009', '2025-08-25 07:10:01.635786');
INSERT INTO public."Notifications" VALUES ('NOT164', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK009', '2025-08-25 07:10:01.636172');
INSERT INTO public."Notifications" VALUES ('NOT167', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK003', '2025-08-25 07:10:01.729056');
INSERT INTO public."Notifications" VALUES ('NOT166', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK003', '2025-08-25 07:10:01.72879');
INSERT INTO public."Notifications" VALUES ('NOT169', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK016', '2025-08-25 07:10:01.835726');
INSERT INTO public."Notifications" VALUES ('NOT168', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK016', '2025-08-25 07:10:01.889457');
INSERT INTO public."Notifications" VALUES ('NOT171', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK019', '2025-08-25 07:10:01.933748');
INSERT INTO public."Notifications" VALUES ('NOT170', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK019', '2025-08-25 07:10:01.935086');
INSERT INTO public."Notifications" VALUES ('NOT172', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK020', '2025-08-25 07:10:02.034371');
INSERT INTO public."Notifications" VALUES ('NOT173', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK020', '2025-08-25 07:10:02.03536');
INSERT INTO public."Notifications" VALUES ('NOT174', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK001', '2025-08-25 07:10:46.330813');
INSERT INTO public."Notifications" VALUES ('NOT175', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK001', '2025-08-25 07:10:46.331485');
INSERT INTO public."Notifications" VALUES ('NOT176', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK016', '2025-08-25 07:10:46.332431');
INSERT INTO public."Notifications" VALUES ('NOT177', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK016', '2025-08-25 07:10:46.332919');
INSERT INTO public."Notifications" VALUES ('NOT178', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK003', '2025-08-25 07:10:46.33405');
INSERT INTO public."Notifications" VALUES ('NOT179', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK003', '2025-08-25 07:10:46.334873');
INSERT INTO public."Notifications" VALUES ('NOT181', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK009', '2025-08-25 07:10:47.290792');
INSERT INTO public."Notifications" VALUES ('NOT183', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK002', '2025-08-25 07:10:47.29431');
INSERT INTO public."Notifications" VALUES ('NOT187', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK018', '2025-08-25 07:10:47.590164');
INSERT INTO public."Notifications" VALUES ('NOT186', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK018', '2025-08-25 07:10:47.598754');
INSERT INTO public."Notifications" VALUES ('NOT185', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK017', '2025-08-25 07:10:47.689343');
INSERT INTO public."Notifications" VALUES ('NOT180', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK009', '2025-08-25 07:10:47.638223');
INSERT INTO public."Notifications" VALUES ('NOT182', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK002', '2025-08-25 07:10:47.725096');
INSERT INTO public."Notifications" VALUES ('NOT184', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK017', '2025-08-25 07:10:47.786899');
INSERT INTO public."Notifications" VALUES ('NOT188', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK019', '2025-08-25 07:10:47.848269');
INSERT INTO public."Notifications" VALUES ('NOT191', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK020', '2025-08-25 07:10:47.863329');
INSERT INTO public."Notifications" VALUES ('NOT189', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK019', '2025-08-25 07:10:47.889988');
INSERT INTO public."Notifications" VALUES ('NOT190', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK020', '2025-08-25 07:10:47.888773');
INSERT INTO public."Notifications" VALUES ('NOT192', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK001', '2025-08-25 07:45:31.874257');
INSERT INTO public."Notifications" VALUES ('NOT195', 'USR001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term (TRM002) has been completed by Admin User', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-25 07:45:31.998094');
INSERT INTO public."Notifications" VALUES ('NOT194', 'TESTUSER001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term (TRM002) has been completed by Admin User', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-25 07:45:31.997249');
INSERT INTO public."Notifications" VALUES ('NOT196', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK020', '2025-08-25 07:45:32.025974');
INSERT INTO public."Notifications" VALUES ('NOT197', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK020', '2025-08-25 07:45:32.027712');
INSERT INTO public."Notifications" VALUES ('NOT193', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK001', '2025-08-25 07:45:32.614458');
INSERT INTO public."Notifications" VALUES ('NOT201', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK003', '2025-08-25 07:45:33.092495');
INSERT INTO public."Notifications" VALUES ('NOT198', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK002', '2025-08-25 07:45:33.092759');
INSERT INTO public."Notifications" VALUES ('NOT199', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK002', '2025-08-25 07:45:33.098703');
INSERT INTO public."Notifications" VALUES ('NOT200', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK003', '2025-08-25 07:45:33.098042');
INSERT INTO public."Notifications" VALUES ('NOT203', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK017', '2025-08-25 07:45:33.136511');
INSERT INTO public."Notifications" VALUES ('NOT205', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK016', '2025-08-25 07:45:33.140525');
INSERT INTO public."Notifications" VALUES ('NOT204', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK016', '2025-08-25 07:45:33.143334');
INSERT INTO public."Notifications" VALUES ('NOT202', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK017', '2025-08-25 07:45:33.190441');
INSERT INTO public."Notifications" VALUES ('NOT207', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK009', '2025-08-25 07:45:33.195247');
INSERT INTO public."Notifications" VALUES ('NOT206', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK009', '2025-08-25 07:45:33.198691');
INSERT INTO public."Notifications" VALUES ('NOT209', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK018', '2025-08-25 07:45:33.308562');
INSERT INTO public."Notifications" VALUES ('NOT208', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK018', '2025-08-25 07:45:33.317743');
INSERT INTO public."Notifications" VALUES ('NOT210', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK019', '2025-08-25 07:45:33.393569');
INSERT INTO public."Notifications" VALUES ('NOT211', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK019', '2025-08-25 07:45:33.394112');
INSERT INTO public."Notifications" VALUES ('NOT212', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK003', '2025-08-25 07:48:47.662792');
INSERT INTO public."Notifications" VALUES ('NOT214', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK002', '2025-08-25 07:48:47.854245');
INSERT INTO public."Notifications" VALUES ('NOT215', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK002', '2025-08-25 07:48:47.857348');
INSERT INTO public."Notifications" VALUES ('NOT216', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK017', '2025-08-25 07:48:47.933114');
INSERT INTO public."Notifications" VALUES ('NOT217', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK017', '2025-08-25 07:48:47.988417');
INSERT INTO public."Notifications" VALUES ('NOT218', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK018', '2025-08-25 07:48:48.08936');
INSERT INTO public."Notifications" VALUES ('NOT219', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK018', '2025-08-25 07:48:48.091331');
INSERT INTO public."Notifications" VALUES ('NOT221', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK020', '2025-08-25 07:48:48.186769');
INSERT INTO public."Notifications" VALUES ('NOT220', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK020', '2025-08-25 07:48:48.188372');
INSERT INTO public."Notifications" VALUES ('NOT222', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK019', '2025-08-25 07:48:48.234016');
INSERT INTO public."Notifications" VALUES ('NOT223', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK019', '2025-08-25 07:48:48.234561');
INSERT INTO public."Notifications" VALUES ('NOT225', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK016', '2025-08-25 07:48:48.406132');
INSERT INTO public."Notifications" VALUES ('NOT224', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK016', '2025-08-25 07:48:48.406114');
INSERT INTO public."Notifications" VALUES ('NOT226', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK009', '2025-08-25 07:48:48.574426');
INSERT INTO public."Notifications" VALUES ('NOT227', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK009', '2025-08-25 07:48:48.576045');
INSERT INTO public."Notifications" VALUES ('NOT228', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK001', '2025-08-25 07:48:48.617317');
INSERT INTO public."Notifications" VALUES ('NOT229', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK001', '2025-08-25 07:48:48.618147');
INSERT INTO public."Notifications" VALUES ('NOT213', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK003', '2025-08-25 07:48:48.663045');
INSERT INTO public."Notifications" VALUES ('NOT230', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report SK Officials CSV Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 10:37:41.402362');
INSERT INTO public."Notifications" VALUES ('NOT231', 'USR001', 'admin', NULL, 'New Report Added', 'Report SK Officials CSV Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 10:37:42.004135');
INSERT INTO public."Notifications" VALUES ('NOT233', 'USR001', 'admin', NULL, 'New Report Added', 'Report SK Officials PDF Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 10:41:16.366937');
INSERT INTO public."Notifications" VALUES ('NOT232', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report SK Officials PDF Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 10:41:16.367064');
INSERT INTO public."Notifications" VALUES ('NOT234', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report SK Officials CSV Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 10:42:22.703486');
INSERT INTO public."Notifications" VALUES ('NOT235', 'USR001', 'admin', NULL, 'New Report Added', 'Report SK Officials CSV Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 10:42:23.326925');
INSERT INTO public."Notifications" VALUES ('NOT236', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report SK Officials CSV Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 11:59:52.649377');
INSERT INTO public."Notifications" VALUES ('NOT237', 'USR001', 'admin', NULL, 'New Report Added', 'Report SK Officials CSV Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 11:59:53.180243');
INSERT INTO public."Notifications" VALUES ('NOT239', 'USR001', 'admin', NULL, 'New Report Added', 'Report SK Officials PDF Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 12:15:50.281349');
INSERT INTO public."Notifications" VALUES ('NOT238', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report SK Officials PDF Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 12:15:50.286331');
INSERT INTO public."Notifications" VALUES ('NOT240', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report SK Officials CSV Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 12:26:24.936722');
INSERT INTO public."Notifications" VALUES ('NOT241', 'USR001', 'admin', NULL, 'New Report Added', 'Report SK Officials CSV Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 12:26:25.49335');
INSERT INTO public."Notifications" VALUES ('NOT242', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report SK Officials CSV Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 14:11:09.184794');
INSERT INTO public."Notifications" VALUES ('NOT243', 'USR001', 'admin', NULL, 'New Report Added', 'Report SK Officials CSV Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 14:11:10.112657');
INSERT INTO public."Notifications" VALUES ('NOT244', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report SK Officials CSV Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 14:15:09.637608');
INSERT INTO public."Notifications" VALUES ('NOT245', 'USR001', 'admin', NULL, 'New Report Added', 'Report SK Officials CSV Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 14:15:09.641428');
INSERT INTO public."Notifications" VALUES ('NOT246', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 14:15:36.839824');
INSERT INTO public."Notifications" VALUES ('NOT247', 'USR001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 14:15:36.83613');
INSERT INTO public."Notifications" VALUES ('NOT248', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (3 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 14:15:44.595931');
INSERT INTO public."Notifications" VALUES ('NOT251', 'USR001', 'admin', NULL, 'New Report Added', 'Report SK Officials PDF Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 14:16:12.716932');
INSERT INTO public."Notifications" VALUES ('NOT250', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report SK Officials PDF Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 14:16:12.71694');
INSERT INTO public."Notifications" VALUES ('NOT252', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Export completed: Term Detailed Export — 9 records — Term TRM002 — Format JSON', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 14:42:51.549354');
INSERT INTO public."Notifications" VALUES ('NOT253', 'USR001', 'admin', NULL, 'New Report Added', 'Export completed: Term Detailed Export — 9 records — Term TRM002 — Format JSON', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 14:42:51.5498');
INSERT INTO public."Notifications" VALUES ('NOT254', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Export completed: Term Detailed Export — 9 records — Term TRM002 — Format JSON', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 14:43:43.839426');
INSERT INTO public."Notifications" VALUES ('NOT257', 'USR001', 'admin', NULL, 'New Report Added', 'Export completed: Term Detailed Export — 9 records — Term TRM002 — Format JSON', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 15:07:01.053556');
INSERT INTO public."Notifications" VALUES ('NOT256', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Export completed: Term Detailed Export — 9 records — Term TRM002 — Format JSON', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 15:07:01.055185');
INSERT INTO public."Notifications" VALUES ('NOT255', 'USR001', 'admin', NULL, 'New Report Added', 'Export completed: Term Detailed Export — 9 records — Term TRM002 — Format JSON', 'info', 'normal', true, '2025-08-26 15:08:14.466203', NULL, 'LYDO001', '2025-08-26 14:43:43.839308');
INSERT INTO public."Notifications" VALUES ('NOT249', 'USR001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (3 records) has been created by Maria Santos', 'info', 'normal', true, '2025-08-26 15:08:51.007383', NULL, 'LYDO001', '2025-08-26 14:15:44.604835');
INSERT INTO public."Notifications" VALUES ('NOT258', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 15:49:47.215595');
INSERT INTO public."Notifications" VALUES ('NOT259', 'USR001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 15:49:47.226341');
INSERT INTO public."Notifications" VALUES ('NOT260', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 16:01:08.596332');
INSERT INTO public."Notifications" VALUES ('NOT261', 'USR001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-26 16:01:08.596001');
INSERT INTO public."Notifications" VALUES ('NOT263', 'USR001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term (TRM002) has been completed by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:13.234689');
INSERT INTO public."Notifications" VALUES ('NOT264', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (undefined) - SK001 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:13.247406');
INSERT INTO public."Notifications" VALUES ('NOT262', 'TESTUSER001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term (TRM002) has been completed by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:13.237268');
INSERT INTO public."Notifications" VALUES ('NOT268', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (undefined) - SK017 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:13.887869');
INSERT INTO public."Notifications" VALUES ('NOT269', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (undefined) - SK017 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:13.991695');
INSERT INTO public."Notifications" VALUES ('NOT267', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (undefined) - SK003 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:14.088775');
INSERT INTO public."Notifications" VALUES ('NOT270', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (undefined) - SK018 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:14.187118');
INSERT INTO public."Notifications" VALUES ('NOT271', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (undefined) - SK018 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:14.191203');
INSERT INTO public."Notifications" VALUES ('NOT272', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (undefined) - SK002 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:14.227285');
INSERT INTO public."Notifications" VALUES ('NOT273', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (undefined) - SK002 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:14.287147');
INSERT INTO public."Notifications" VALUES ('NOT275', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (undefined) - SK020 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:14.387387');
INSERT INTO public."Notifications" VALUES ('NOT266', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (undefined) - SK003 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:14.394738');
INSERT INTO public."Notifications" VALUES ('NOT274', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (undefined) - SK020 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:14.394626');
INSERT INTO public."Notifications" VALUES ('NOT265', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (undefined) - SK001 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:14.395018');
INSERT INTO public."Notifications" VALUES ('NOT277', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (undefined) - SK016 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:14.589114');
INSERT INTO public."Notifications" VALUES ('NOT276', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (undefined) - SK016 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:14.589894');
INSERT INTO public."Notifications" VALUES ('NOT279', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (undefined) - SK019 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:14.933534');
INSERT INTO public."Notifications" VALUES ('NOT278', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (undefined) - SK019 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:14.934511');
INSERT INTO public."Notifications" VALUES ('NOT280', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (undefined) - SK009 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:14.986947');
INSERT INTO public."Notifications" VALUES ('NOT281', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (undefined) - SK009 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 16:49:14.988099');
INSERT INTO public."Notifications" VALUES ('NOT282', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK001', '2025-08-26 18:02:10.947564');
INSERT INTO public."Notifications" VALUES ('NOT283', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK001', '2025-08-26 18:02:10.948719');
INSERT INTO public."Notifications" VALUES ('NOT284', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK003', '2025-08-26 18:02:11.776254');
INSERT INTO public."Notifications" VALUES ('NOT285', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK003', '2025-08-26 18:02:11.816002');
INSERT INTO public."Notifications" VALUES ('NOT286', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK016', '2025-08-26 18:02:12.607043');
INSERT INTO public."Notifications" VALUES ('NOT288', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK009', '2025-08-26 18:02:12.644351');
INSERT INTO public."Notifications" VALUES ('NOT289', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK009', '2025-08-26 18:02:12.686751');
INSERT INTO public."Notifications" VALUES ('NOT287', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK016', '2025-08-26 18:02:12.609281');
INSERT INTO public."Notifications" VALUES ('NOT290', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK002', '2025-08-26 18:02:12.842285');
INSERT INTO public."Notifications" VALUES ('NOT295', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK020', '2025-08-26 18:02:12.887539');
INSERT INTO public."Notifications" VALUES ('NOT291', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK002', '2025-08-26 18:02:12.901554');
INSERT INTO public."Notifications" VALUES ('NOT292', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK017', '2025-08-26 18:02:12.903505');
INSERT INTO public."Notifications" VALUES ('NOT293', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK017', '2025-08-26 18:02:12.908671');
INSERT INTO public."Notifications" VALUES ('NOT297', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK018', '2025-08-26 18:02:12.914481');
INSERT INTO public."Notifications" VALUES ('NOT296', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK018', '2025-08-26 18:02:12.927342');
INSERT INTO public."Notifications" VALUES ('NOT294', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK020', '2025-08-26 18:02:12.93333');
INSERT INTO public."Notifications" VALUES ('NOT299', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK019', '2025-08-26 18:02:12.979941');
INSERT INTO public."Notifications" VALUES ('NOT298', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK019', '2025-08-26 18:02:12.990625');
INSERT INTO public."Notifications" VALUES ('NOT300', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK002', '2025-08-26 18:54:30.181391');
INSERT INTO public."Notifications" VALUES ('NOT302', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK019', '2025-08-26 18:54:30.235615');
INSERT INTO public."Notifications" VALUES ('NOT305', 'USR001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term (TRM002) has been completed by Admin User', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 18:54:30.359535');
INSERT INTO public."Notifications" VALUES ('NOT304', 'TESTUSER001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term (TRM002) has been completed by Admin User', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 18:54:30.36');
INSERT INTO public."Notifications" VALUES ('NOT306', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK018', '2025-08-26 18:54:30.460583');
INSERT INTO public."Notifications" VALUES ('NOT307', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK018', '2025-08-26 18:54:30.461968');
INSERT INTO public."Notifications" VALUES ('NOT311', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK003', '2025-08-26 18:54:31.084643');
INSERT INTO public."Notifications" VALUES ('NOT309', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK016', '2025-08-26 18:54:31.13063');
INSERT INTO public."Notifications" VALUES ('NOT308', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK016', '2025-08-26 18:54:31.131354');
INSERT INTO public."Notifications" VALUES ('NOT310', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK003', '2025-08-26 18:54:31.131018');
INSERT INTO public."Notifications" VALUES ('NOT314', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK020', '2025-08-26 18:54:31.193336');
INSERT INTO public."Notifications" VALUES ('NOT313', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK001', '2025-08-26 18:54:31.195732');
INSERT INTO public."Notifications" VALUES ('NOT312', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK001', '2025-08-26 18:54:31.222331');
INSERT INTO public."Notifications" VALUES ('NOT315', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK020', '2025-08-26 18:54:31.243509');
INSERT INTO public."Notifications" VALUES ('NOT317', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK009', '2025-08-26 18:54:31.490917');
INSERT INTO public."Notifications" VALUES ('NOT316', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK009', '2025-08-26 18:54:31.493511');
INSERT INTO public."Notifications" VALUES ('NOT318', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK017', '2025-08-26 18:54:31.57382');
INSERT INTO public."Notifications" VALUES ('NOT301', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK002', '2025-08-26 18:54:31.592423');
INSERT INTO public."Notifications" VALUES ('NOT319', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK017', '2025-08-26 18:54:31.602336');
INSERT INTO public."Notifications" VALUES ('NOT303', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been deactivated by undefined undefined', 'warning', 'normal', false, NULL, NULL, 'SK019', '2025-08-26 18:54:31.605339');
INSERT INTO public."Notifications" VALUES ('NOT320', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK001', '2025-08-26 18:54:52.684474');
INSERT INTO public."Notifications" VALUES ('NOT322', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK003', '2025-08-26 18:54:53.450531');
INSERT INTO public."Notifications" VALUES ('NOT324', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK020', '2025-08-26 18:54:53.484945');
INSERT INTO public."Notifications" VALUES ('NOT326', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK016', '2025-08-26 18:54:53.526944');
INSERT INTO public."Notifications" VALUES ('NOT321', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK001', '2025-08-26 18:54:53.646722');
INSERT INTO public."Notifications" VALUES ('NOT323', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK003', '2025-08-26 18:54:54.239822');
INSERT INTO public."Notifications" VALUES ('NOT328', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK017', '2025-08-26 18:54:54.643168');
INSERT INTO public."Notifications" VALUES ('NOT329', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK017', '2025-08-26 18:54:54.649942');
INSERT INTO public."Notifications" VALUES ('NOT327', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK016', '2025-08-26 18:54:54.673056');
INSERT INTO public."Notifications" VALUES ('NOT331', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK018', '2025-08-26 18:54:54.743612');
INSERT INTO public."Notifications" VALUES ('NOT325', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK020', '2025-08-26 18:54:54.786759');
INSERT INTO public."Notifications" VALUES ('NOT330', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK018', '2025-08-26 18:54:54.78875');
INSERT INTO public."Notifications" VALUES ('NOT332', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK002', '2025-08-26 18:54:54.789375');
INSERT INTO public."Notifications" VALUES ('NOT333', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK002', '2025-08-26 18:54:54.790055');
INSERT INTO public."Notifications" VALUES ('NOT335', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK019', '2025-08-26 18:54:54.886763');
INSERT INTO public."Notifications" VALUES ('NOT334', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK019', '2025-08-26 18:54:54.887918');
INSERT INTO public."Notifications" VALUES ('NOT336', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK009', '2025-08-26 18:54:54.933225');
INSERT INTO public."Notifications" VALUES ('NOT337', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK009', '2025-08-26 18:54:54.934174');
INSERT INTO public."Notifications" VALUES ('NOT338', 'TESTUSER001', 'admin', NULL, 'SK Term Updated', 'SK Term 2025-2027 Term Updae (TRM002) has been updated by Admin User. Changes: termName', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 18:55:41.555');
INSERT INTO public."Notifications" VALUES ('NOT339', 'USR001', 'admin', NULL, 'SK Term Updated', 'SK Term 2025-2027 Term Updae (TRM002) has been updated by Admin User. Changes: termName', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 18:55:41.555656');
INSERT INTO public."Notifications" VALUES ('NOT340', 'TESTUSER001', 'admin', NULL, 'SK Term Updated', 'SK Term 2025-2027 Term Updae (TRM002) has been updated by Admin User. Profile updated', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 18:55:59.353752');
INSERT INTO public."Notifications" VALUES ('NOT341', 'USR001', 'admin', NULL, 'SK Term Updated', 'SK Term 2025-2027 Term Updae (TRM002) has been updated by Admin User. Profile updated', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-26 18:55:59.35536');
INSERT INTO public."Notifications" VALUES ('NOT342', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-27 12:27:42.349327');
INSERT INTO public."Notifications" VALUES ('NOT343', 'USR001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-27 12:27:42.36806');
INSERT INTO public."Notifications" VALUES ('NOT345', 'USR001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-27 12:28:12.084233');
INSERT INTO public."Notifications" VALUES ('NOT344', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-27 12:28:12.087393');
INSERT INTO public."Notifications" VALUES ('NOT346', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-27 13:24:51.367031');
INSERT INTO public."Notifications" VALUES ('NOT347', 'USR001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-27 13:24:51.367582');
INSERT INTO public."Notifications" VALUES ('NOT348', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (3 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-27 15:53:04.006345');
INSERT INTO public."Notifications" VALUES ('NOT349', 'USR001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (3 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-27 15:53:04.006149');
INSERT INTO public."Notifications" VALUES ('NOT350', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (1 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-28 07:19:08.929661');
INSERT INTO public."Notifications" VALUES ('NOT351', 'USR001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (1 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-28 07:19:08.929661');
INSERT INTO public."Notifications" VALUES ('NOT353', 'USR001', 'admin', NULL, 'SK Official Updated', 'SK Official Luisa Ramos (SK Treasurer) - SK018 has been updated by Maria Santos. Profile updated', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-28 09:04:03.241529');
INSERT INTO public."Notifications" VALUES ('NOT352', 'TESTUSER001', 'admin', NULL, 'SK Official Updated', 'SK Official Luisa Ramos (SK Treasurer) - SK018 has been updated by Maria Santos. Profile updated', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-28 09:04:03.250319');
INSERT INTO public."Notifications" VALUES ('NOT354', 'TESTUSER001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term Updae (TRM002) has been completed by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:08.168795');
INSERT INTO public."Notifications" VALUES ('NOT355', 'USR001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term Updae (TRM002) has been completed by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:08.169355');
INSERT INTO public."Notifications" VALUES ('NOT356', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (undefined) - SK001 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:08.170256');
INSERT INTO public."Notifications" VALUES ('NOT362', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (undefined) - SK009 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:08.18519');
INSERT INTO public."Notifications" VALUES ('NOT364', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (undefined) - SK002 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:08.196147');
INSERT INTO public."Notifications" VALUES ('NOT366', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (undefined) - SK017 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:08.209878');
INSERT INTO public."Notifications" VALUES ('NOT368', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (undefined) - SK018 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:08.221144');
INSERT INTO public."Notifications" VALUES ('NOT370', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (undefined) - SK019 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:08.234145');
INSERT INTO public."Notifications" VALUES ('NOT371', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (undefined) - SK019 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:08.236635');
INSERT INTO public."Notifications" VALUES ('NOT372', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (undefined) - SK020 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:08.244969');
INSERT INTO public."Notifications" VALUES ('NOT373', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (undefined) - SK020 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:08.247515');
INSERT INTO public."Notifications" VALUES ('NOT365', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (undefined) - SK002 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:09.165997');
INSERT INTO public."Notifications" VALUES ('NOT369', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (undefined) - SK018 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:09.174333');
INSERT INTO public."Notifications" VALUES ('NOT358', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (undefined) - SK003 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:09.989479');
INSERT INTO public."Notifications" VALUES ('NOT357', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (undefined) - SK001 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:10.141555');
INSERT INTO public."Notifications" VALUES ('NOT367', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (undefined) - SK017 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:10.143682');
INSERT INTO public."Notifications" VALUES ('NOT360', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (undefined) - SK016 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:10.1412');
INSERT INTO public."Notifications" VALUES ('NOT361', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (undefined) - SK016 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:10.145283');
INSERT INTO public."Notifications" VALUES ('NOT363', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (undefined) - SK009 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:10.147332');
INSERT INTO public."Notifications" VALUES ('NOT359', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (undefined) - SK003 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-28 16:11:10.204065');
INSERT INTO public."Notifications" VALUES ('NOT381', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK009', '2025-08-28 16:11:43.213424');
INSERT INTO public."Notifications" VALUES ('NOT380', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK009', '2025-08-28 16:11:43.217437');
INSERT INTO public."Notifications" VALUES ('NOT382', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK002', '2025-08-28 16:11:43.219338');
INSERT INTO public."Notifications" VALUES ('NOT374', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK003', '2025-08-28 16:11:43.222673');
INSERT INTO public."Notifications" VALUES ('NOT378', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK016', '2025-08-28 16:11:43.221033');
INSERT INTO public."Notifications" VALUES ('NOT376', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK001', '2025-08-28 16:11:43.226344');
INSERT INTO public."Notifications" VALUES ('NOT377', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK001', '2025-08-28 16:11:43.227563');
INSERT INTO public."Notifications" VALUES ('NOT379', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK016', '2025-08-28 16:11:43.227766');
INSERT INTO public."Notifications" VALUES ('NOT375', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK003', '2025-08-28 16:11:43.236599');
INSERT INTO public."Notifications" VALUES ('NOT383', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK002', '2025-08-28 16:11:44.037736');
INSERT INTO public."Notifications" VALUES ('NOT387', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK018', '2025-08-28 16:11:44.168489');
INSERT INTO public."Notifications" VALUES ('NOT384', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK017', '2025-08-28 16:11:45.010335');
INSERT INTO public."Notifications" VALUES ('NOT386', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK018', '2025-08-28 16:11:45.189509');
INSERT INTO public."Notifications" VALUES ('NOT385', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK017', '2025-08-28 16:11:45.226907');
INSERT INTO public."Notifications" VALUES ('NOT388', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK019', '2025-08-28 16:11:45.238429');
INSERT INTO public."Notifications" VALUES ('NOT389', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK019', '2025-08-28 16:11:45.232347');
INSERT INTO public."Notifications" VALUES ('NOT390', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK020', '2025-08-28 16:11:45.314348');
INSERT INTO public."Notifications" VALUES ('NOT391', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK020', '2025-08-28 16:11:45.301704');
INSERT INTO public."Notifications" VALUES ('NOT392', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-29 06:32:11.12546');
INSERT INTO public."Notifications" VALUES ('NOT393', 'USR001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-29 06:32:11.125131');
INSERT INTO public."Notifications" VALUES ('NOT394', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-29 06:32:20.274026');
INSERT INTO public."Notifications" VALUES ('NOT395', 'USR001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-29 06:32:20.274019');
INSERT INTO public."Notifications" VALUES ('NOT396', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-29 06:40:12.890342');
INSERT INTO public."Notifications" VALUES ('NOT397', 'USR001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-29 06:40:12.890959');
INSERT INTO public."Notifications" VALUES ('NOT399', 'USR001', 'admin', NULL, 'New Report Added', 'Report SK Officials PDF Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-29 06:42:49.117189');
INSERT INTO public."Notifications" VALUES ('NOT398', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report SK Officials PDF Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-29 06:42:49.118328');
INSERT INTO public."Notifications" VALUES ('NOT400', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-29 06:44:26.81919');
INSERT INTO public."Notifications" VALUES ('NOT401', 'USR001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-29 06:44:26.820063');
INSERT INTO public."Notifications" VALUES ('NOT402', 'USR031', 'lydo_staff', NULL, 'Welcome to LYDO Youth Governance', 'Welcome Try carandang! Your account has been created successfully.', 'info', 'low', false, NULL, NULL, 'USR031', '2025-08-29 07:53:29.353385');
INSERT INTO public."Notifications" VALUES ('NOT403', 'TESTUSER001', 'admin', NULL, 'New Staff Member Added', 'Staff member undefined undefined (undefined) has been created by Maria Santos. Personal Email: undefined', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-29 07:53:29.493259');
INSERT INTO public."Notifications" VALUES ('NOT404', 'USR001', 'admin', NULL, 'New Staff Member Added', 'Staff member undefined undefined (undefined) has been created by Maria Santos. Personal Email: undefined', 'info', 'normal', true, '2025-08-29 07:54:41.391069', NULL, 'LYDO001', '2025-08-29 07:53:29.426469');
INSERT INTO public."Notifications" VALUES ('NOT405', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-29 11:14:47.954583');
INSERT INTO public."Notifications" VALUES ('NOT406', 'USR001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-29 11:14:49.375362');
INSERT INTO public."Notifications" VALUES ('NOT407', 'TESTUSER001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term Updae (TRM002) has been completed by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:13.196432');
INSERT INTO public."Notifications" VALUES ('NOT410', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (undefined) - SK003 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:13.870915');
INSERT INTO public."Notifications" VALUES ('NOT409', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (undefined) - SK003 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:13.870997');
INSERT INTO public."Notifications" VALUES ('NOT411', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (undefined) - SK009 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:13.887498');
INSERT INTO public."Notifications" VALUES ('NOT412', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (undefined) - SK009 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:13.89013');
INSERT INTO public."Notifications" VALUES ('NOT413', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (undefined) - SK002 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:14.930404');
INSERT INTO public."Notifications" VALUES ('NOT415', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (undefined) - SK016 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:14.988342');
INSERT INTO public."Notifications" VALUES ('NOT416', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (undefined) - SK016 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:14.987762');
INSERT INTO public."Notifications" VALUES ('NOT414', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (undefined) - SK002 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:14.988526');
INSERT INTO public."Notifications" VALUES ('NOT417', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (undefined) - SK020 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:15.343425');
INSERT INTO public."Notifications" VALUES ('NOT418', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (undefined) - SK020 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:15.342034');
INSERT INTO public."Notifications" VALUES ('NOT408', 'USR001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term Updae (TRM002) has been completed by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:15.392374');
INSERT INTO public."Notifications" VALUES ('NOT419', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (undefined) - SK018 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:15.452976');
INSERT INTO public."Notifications" VALUES ('NOT420', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (undefined) - SK018 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:15.488518');
INSERT INTO public."Notifications" VALUES ('NOT422', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (undefined) - SK019 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:15.529035');
INSERT INTO public."Notifications" VALUES ('NOT421', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (undefined) - SK019 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:15.529489');
INSERT INTO public."Notifications" VALUES ('NOT424', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (undefined) - SK001 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:15.538813');
INSERT INTO public."Notifications" VALUES ('NOT423', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (undefined) - SK001 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:15.53665');
INSERT INTO public."Notifications" VALUES ('NOT425', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (undefined) - SK017 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:15.587092');
INSERT INTO public."Notifications" VALUES ('NOT426', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (undefined) - SK017 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-08-31 06:56:15.588313');
INSERT INTO public."Notifications" VALUES ('NOT427', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK001', '2025-08-31 06:56:35.70276');
INSERT INTO public."Notifications" VALUES ('NOT428', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (SK Official) - SK001 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK001', '2025-08-31 06:56:35.702899');
INSERT INTO public."Notifications" VALUES ('NOT429', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK003', '2025-08-31 06:56:35.703241');
INSERT INTO public."Notifications" VALUES ('NOT430', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (SK Official) - SK003 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK003', '2025-08-31 06:56:35.703848');
INSERT INTO public."Notifications" VALUES ('NOT431', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK016', '2025-08-31 06:56:35.704234');
INSERT INTO public."Notifications" VALUES ('NOT432', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (SK Official) - SK016 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK016', '2025-08-31 06:56:35.704893');
INSERT INTO public."Notifications" VALUES ('NOT434', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK009', '2025-08-31 06:56:35.706268');
INSERT INTO public."Notifications" VALUES ('NOT433', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (SK Official) - SK009 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK009', '2025-08-31 06:56:35.706538');
INSERT INTO public."Notifications" VALUES ('NOT435', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK002', '2025-08-31 06:56:35.707086');
INSERT INTO public."Notifications" VALUES ('NOT436', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (SK Official) - SK002 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK002', '2025-08-31 06:56:35.707452');
INSERT INTO public."Notifications" VALUES ('NOT437', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK017', '2025-08-31 06:56:35.707353');
INSERT INTO public."Notifications" VALUES ('NOT439', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK018', '2025-08-31 06:56:35.717168');
INSERT INTO public."Notifications" VALUES ('NOT441', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK019', '2025-08-31 06:56:35.734042');
INSERT INTO public."Notifications" VALUES ('NOT443', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK020', '2025-08-31 06:56:35.743235');
INSERT INTO public."Notifications" VALUES ('NOT440', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (SK Official) - SK018 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK018', '2025-08-31 06:56:36.457995');
INSERT INTO public."Notifications" VALUES ('NOT442', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (SK Official) - SK019 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK019', '2025-08-31 06:56:37.438476');
INSERT INTO public."Notifications" VALUES ('NOT444', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (SK Official) - SK020 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK020', '2025-08-31 06:56:37.466486');
INSERT INTO public."Notifications" VALUES ('NOT438', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (SK Official) - SK017 has been activated by undefined undefined', 'success', 'normal', false, NULL, NULL, 'SK017', '2025-08-31 06:56:37.496778');
INSERT INTO public."Notifications" VALUES ('NOT445', 'TESTUSER001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-31 12:42:11.579162');
INSERT INTO public."Notifications" VALUES ('NOT446', 'USR001', 'admin', NULL, 'New Report Added', 'Report Term Detailed Export (9 records) has been created by Maria Santos', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-08-31 12:42:11.578789');
INSERT INTO public."Notifications" VALUES ('NOT447', 'USR032', 'sk_official', NULL, 'Welcome to SK Governance', 'Welcome Tryyy carandanghkhkfdsfsdgghgkj! You have been assigned as SK Treasurer. Your organizational email is tcarandanghkhkfdsfsdgghgkj.bigain.ii@lydo.gov.ph', 'info', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-03 17:35:39.583107');
INSERT INTO public."Notifications" VALUES ('NOT448', 'TESTUSER001', 'admin', NULL, 'New SK Official Added', 'SK Official Tryyy carandanghkhkfdsfsdgghgkj (SK Treasurer) - SK021 has been created by Maria Santos for Bigain II', 'info', 'normal', false, NULL, NULL, 'LYDO001', '2025-09-03 17:35:41.182646');
INSERT INTO public."Notifications" VALUES ('NOT449', 'USR001', 'admin', NULL, 'New SK Official Added', 'SK Official Tryyy carandanghkhkfdsfsdgghgkj (SK Treasurer) - SK021 has been created by Maria Santos for Bigain II', 'info', 'normal', true, '2025-09-03 17:35:51.517369', NULL, 'LYDO001', '2025-09-03 17:35:41.190271');
INSERT INTO public."Notifications" VALUES ('NOT452', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (undefined) - SK001 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:45.471867');
INSERT INTO public."Notifications" VALUES ('NOT454', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Tryyy carandanghkhkfdsfsdgghgkj (undefined) - SK021 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:45.472482');
INSERT INTO public."Notifications" VALUES ('NOT451', 'USR001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term Updae (TRM002) has been completed by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:45.473256');
INSERT INTO public."Notifications" VALUES ('NOT450', 'TESTUSER001', 'admin', NULL, 'SK Term Status Changed', 'SK Term 2025-2027 Term Updae (TRM002) has been completed by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:45.474331');
INSERT INTO public."Notifications" VALUES ('NOT453', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Miguel Santos (undefined) - SK001 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:45.475106');
INSERT INTO public."Notifications" VALUES ('NOT457', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (undefined) - SK003 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:45.476547');
INSERT INTO public."Notifications" VALUES ('NOT455', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Tryyy carandanghkhkfdsfsdgghgkj (undefined) - SK021 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:45.475434');
INSERT INTO public."Notifications" VALUES ('NOT456', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luis Mendoza (undefined) - SK003 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:45.482678');
INSERT INTO public."Notifications" VALUES ('NOT467', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (undefined) - SK017 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:45.709902');
INSERT INTO public."Notifications" VALUES ('NOT466', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Juan Dela Cruz (undefined) - SK017 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:45.712977');
INSERT INTO public."Notifications" VALUES ('NOT459', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (undefined) - SK016 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:46.149995');
INSERT INTO public."Notifications" VALUES ('NOT468', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (undefined) - SK020 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:46.289328');
INSERT INTO public."Notifications" VALUES ('NOT469', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Jasmine Tan (undefined) - SK020 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:46.290134');
INSERT INTO public."Notifications" VALUES ('NOT463', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (undefined) - SK009 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:46.28753');
INSERT INTO public."Notifications" VALUES ('NOT458', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official try trydjkSDkjfzxfxffsfa (undefined) - SK016 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:46.388394');
INSERT INTO public."Notifications" VALUES ('NOT470', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (undefined) - SK019 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:46.416401');
INSERT INTO public."Notifications" VALUES ('NOT471', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Paolo Garcia (undefined) - SK019 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:46.420826');
INSERT INTO public."Notifications" VALUES ('NOT460', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (undefined) - SK002 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:46.592394');
INSERT INTO public."Notifications" VALUES ('NOT462', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official use email (undefined) - SK009 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:46.598337');
INSERT INTO public."Notifications" VALUES ('NOT461', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Sofia Cruz (undefined) - SK002 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:47.247265');
INSERT INTO public."Notifications" VALUES ('NOT465', 'USR001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (undefined) - SK018 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:47.356114');
INSERT INTO public."Notifications" VALUES ('NOT464', 'TESTUSER001', 'admin', NULL, 'SK Official Status Changed', 'SK Official Luisa Ramos (undefined) - SK018 has been deactivated by System', 'warning', 'normal', false, NULL, NULL, 'SYSTEM', '2025-09-04 06:41:47.389275');


--
-- TOC entry 3459 (class 0 OID 16408)
-- Dependencies: 216
-- Data for Name: Roles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Roles" VALUES ('ROL001', 'admin', 'System Administrator with full access', '{"users": true, "reports": true, "surveys": true, "settings": true, "analytics": true, "dashboard": true, "validation": true, "activity_logs": true, "notifications": true, "role_management": true, "barangay_management": true}', true, '2025-08-10 08:20:57.140355', '2025-08-10 08:20:57.140355');
INSERT INTO public."Roles" VALUES ('ROL003', 'sk_official', 'SK Official with barangay-level access', '{"reports": true, "dashboard": true, "validation": true, "notifications": true, "barangay_limited": true}', true, '2025-08-10 08:20:57.140355', '2025-08-10 08:20:57.140355');
INSERT INTO public."Roles" VALUES ('ROL004', 'youth', 'Youth participant with survey access only', '{"notifications": true, "view_own_data": true, "survey_participation": true}', true, '2025-08-10 08:20:57.140355', '2025-08-10 08:20:57.140355');
INSERT INTO public."Roles" VALUES ('ROL002', 'lydo_staff', 'LYDO Staff with administrative access', '{"reports": true, "analytics": true, "dashboard": true, "staff_view": true, "validation_": true, "surveys_view": true, "activity_logs": true, "barangay_view": true, "notifications": true}', true, '2025-08-10 08:20:57.140355', '2025-08-13 16:04:06.71315');


--
-- TOC entry 3462 (class 0 OID 16456)
-- Dependencies: 219
-- Data for Name: SK_Officials; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."SK_Officials" VALUES ('SK021', 'ROL003', 'TRM002', 'tcarandanghkhkfdsfsdgghgkj.bigain.ii@lydo.gov.ph', 'honmebelleeecarandang@gmail.com', '$2a$12$rwfnu8LrIPdlIqjxZawxl.20Yzufmp5Mr0IKacfNxq6ldirhX6say', 'SJB010', 'Tryyy', 'carandanghkhkfdsfsdgghgkj', '', '', 'SK Treasurer', NULL, true, false, 'LYDO001', '2025-09-03 17:35:38.370719', '2025-09-04 06:41:41.376945', false, '2025-09-04 06:41:41.376945', NULL);
INSERT INTO public."SK_Officials" VALUES ('SK001', 'ROL003', 'TRM002', 'sk.aguila@youthgovernance.com', 'sk.aguila.personal@email.com', '$2a$12$hHOGkZSwqE.zCEoEze8oBuyQoJj8JbQZOH0GKrHE5JxDQk5NVse5C', 'SJB001', 'Miguel', 'Santos', 'Dela', 'Jr.', 'SK Chairperson', NULL, true, true, 'LYDO001', '2025-08-10 08:20:57.397197', '2025-09-04 06:41:41.376945', false, '2025-09-04 06:41:41.376945', NULL);
INSERT INTO public."SK_Officials" VALUES ('SK003', 'ROL003', 'TRM002', 'sk.aya@youthgovernance.com', 'sk.aya.personal@email.com', '$2a$12$hHOGkZSwqE.zCEoEze8oBuyQoJj8JbQZOH0GKrHE5JxDQk5NVse5C', 'SJB003', 'Luis', 'Mendoza', 'Lopez', 'III', 'SK Treasurer', NULL, true, true, 'LYDO001', '2025-08-10 08:20:57.397197', '2025-09-04 06:41:41.376945', false, '2025-09-04 06:41:41.376945', NULL);
INSERT INTO public."SK_Officials" VALUES ('SK016', 'ROL003', 'TRM002', 'ttrydjksdkjfzxfxffsfa.banaybanay.i@lydo.gov.ph', 'tryy0099@gmail.com', '$2a$12$WIE9DHiY7VzTfT7sEnzK2.QoIQ9nbP7PoK9Bhm..zSMoGfF37DSFO', 'SJB007', 'try', 'trydjkSDkjfzxfxffsfa', '', '', 'SK Councilor', NULL, true, false, 'LYDO001', '2025-08-18 19:47:48.49303', '2025-09-04 06:41:41.376945', false, '2025-09-04 06:41:41.376945', NULL);
INSERT INTO public."SK_Officials" VALUES ('SK009', 'ROL003', 'TRM002', 'uemail.bagong.pook@lydo.gov.ph', 'try6@gmail.com', '$2a$12$aY2fNfJzY0Z/G4cCzEgoLODQonN8MeEbZBKF3Fp39jBYydCgsgWze', 'SJB004', 'use', 'email', '', '', 'SK Chairperson', NULL, true, false, 'LYDO001', '2025-08-17 13:15:16.939626', '2025-09-04 06:41:41.376945', false, '2025-09-04 06:41:41.376945', NULL);
INSERT INTO public."SK_Officials" VALUES ('SK002', 'ROL003', 'TRM002', 'sk.anus@youthgovernance.com', 'sk.anus.personal@email.com', '$2a$12$hHOGkZSwqE.zCEoEze8oBuyQoJj8JbQZOH0GKrHE5JxDQk5NVse5C', 'SJB002', 'Sofia', 'Cruz', 'Reyes', '', 'SK Secretary', NULL, false, true, 'LYDO001', '2025-08-10 08:20:57.397197', '2025-09-04 06:41:41.376945', false, '2025-09-04 06:41:41.376945', NULL);
INSERT INTO public."SK_Officials" VALUES ('SK017', 'ROL003', 'TRM002', 'jdela.cruz.anus@lydo.gov.ph', 'juan.delacruz+anus@example.com', '$2a$12$YlS9FDdqkHnJnsI3kh4kGeyRrRI3LHOQWxn.cnFs9om9GndpABVPa', 'SJB002', 'Juan', 'Dela Cruz', 'Reyes', 'Jr.', 'SK Secretary', NULL, true, false, 'BULK_IMPORT', '2025-08-21 11:14:48.858347', '2025-09-04 06:41:41.376945', false, '2025-09-04 06:41:41.376945', NULL);
INSERT INTO public."SK_Officials" VALUES ('SK018', 'ROL003', 'TRM002', 'lramos.aguila@lydo.gov.ph', 'luisa.ramos+aguila@example.com', '$2a$12$7jCs5VQJO.ol4lKmZbzJp.eV5d2Nk0j3WBEg9Zo3vlJF0pSeGddrC', 'SJB001', 'Luisa', 'Ramos', 'Diaz', '', 'SK Treasurer', NULL, true, false, 'BULK_IMPORT', '2025-08-21 11:14:49.873794', '2025-09-04 06:41:41.376945', false, '2025-09-04 06:41:41.376945', NULL);
INSERT INTO public."SK_Officials" VALUES ('SK004', 'ROL003', 'TRM001', 'sk.bagongpook@youthgovernance.com', 'sk.bagongpook.personal@email.com', '$2a$12$hHOGkZSwqE.zCEoEze8oBuyQoJj8JbQZOH0GKrHE5JxDQk5NVse5C', 'SJB004', 'Isabella', 'Villanueva', 'Torres', '', 'SK Chairperson', NULL, true, true, 'LYDO001', '2025-08-10 08:20:57.397197', '2025-08-27 00:26:04.849272', false, '2025-08-23 12:10:38.888248', NULL);
INSERT INTO public."SK_Officials" VALUES ('SK019', 'ROL003', 'TRM002', 'pgarcia.aguila@lydo.gov.ph', 'paolo.garcia+aguila@example.com', '$2a$12$OAl2a9CZAIqdWDwD87.FIeEY9IKQa3I2RQhtckJqlD4lsIyuL0.6u', 'SJB001', 'Paolo', 'Garcia', 'Mendoza', '', 'SK Councilor', NULL, true, false, 'BULK_IMPORT', '2025-08-21 11:14:50.794757', '2025-09-04 06:41:41.376945', false, '2025-09-04 06:41:41.376945', NULL);
INSERT INTO public."SK_Officials" VALUES ('SK020', 'ROL003', 'TRM002', 'jtan.anus@lydo.gov.ph', 'jasmine.tan+anus@example.com', '$2a$12$4Uc8ujO0Qj0Kh5mnbQiusuEpjViA207Q/HLe7dnB5ww2/49Cg3R4S', 'SJB002', 'Jasmine', 'Tan', 'Uy', '', 'SK Councilor', NULL, true, false, 'BULK_IMPORT', '2025-08-21 11:14:52.707824', '2025-09-04 06:41:41.376945', false, '2025-09-04 06:41:41.376945', NULL);


--
-- TOC entry 3463 (class 0 OID 16472)
-- Dependencies: 220
-- Data for Name: SK_Officials_Profiling; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."SK_Officials_Profiling" VALUES ('PRO001', 'SK001', '2000-03-15', 24, 'Male', '+639151234567', 'San Jose National High School', '2025-08-10 08:20:57.463358', '2025-08-10 08:20:57.463358', 45);
INSERT INTO public."SK_Officials_Profiling" VALUES ('PRO002', 'SK002', '1999-07-22', 25, 'Female', '+639151234568', 'Batangas State University', '2025-08-10 08:20:57.463358', '2025-08-10 08:20:57.463358', 38);
INSERT INTO public."SK_Officials_Profiling" VALUES ('PRO003', 'SK003', '2001-11-08', 23, 'Male', '+639151234569', 'San Jose College', '2025-08-10 08:20:57.463358', '2025-08-10 08:20:57.463358', 42);
INSERT INTO public."SK_Officials_Profiling" VALUES ('PRO004', 'SK004', '1998-05-12', 26, 'Female', '+639151234570', 'University of Batangas', '2025-08-10 08:20:57.463358', '2025-08-10 08:20:57.463358', 0);
INSERT INTO public."SK_Officials_Profiling" VALUES ('PRO005', 'SK005', '1997-09-30', 27, 'Male', '+639151234571', 'Lyceum of the Philippines', '2025-08-10 08:20:57.463358', '2025-08-10 08:20:57.463358', 0);


--
-- TOC entry 3461 (class 0 OID 16436)
-- Dependencies: 218
-- Data for Name: SK_Terms; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."SK_Terms" VALUES ('TRM003', '2027-2029 Term', '2027-06-30', '2029-06-30', 'upcoming', false, false, 'LYDO001', '2025-08-10 08:20:57.347213', '2025-08-16 19:57:57.200114', 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, '2025-08-23 16:45:35.897302', NULL, NULL);
INSERT INTO public."SK_Terms" VALUES ('TRM002', '2025-2027 Term Updae', '2025-06-28', '2025-09-01', 'completed', true, true, 'LYDO001', '2025-08-10 08:20:57.347213', '2025-09-04 06:41:41.376945', 3, 3, 0, 1, 1, 1, 0, 'automatic', NULL, '2025-09-04 06:41:41.376945', '2025-09-04 06:41:41.376945', NULL, 'Automatic completion: end date reached');
INSERT INTO public."SK_Terms" VALUES ('TRM004', '2024-2025', '2024-01-22', '2026-07-22', 'completed', true, false, 'ADMIN001', '2025-08-22 14:32:02.683087', '2025-08-23 12:03:06.421272', 0, 0, 0, 0, 0, 0, 0, 'manual', NULL, '2025-08-23 12:03:06.421272', '2025-08-23 12:03:06.421272', NULL, 'Manual completion by admin');
INSERT INTO public."SK_Terms" VALUES ('TRM001', '2023-2025 Test Term', '2023-07-01', '2025-06-30', 'completed', false, false, 'LYDO001', '2025-08-10 08:20:57.347213', '2025-08-23 12:15:31.789719', 2, 0, 2, 1, 1, 0, 0, 'manual', NULL, '2025-08-23 12:15:31.789719', '2025-08-23 12:15:31.789719', NULL, 'Manual completion by admin');
INSERT INTO public."SK_Terms" VALUES ('TRM005', '2030-2031', '2030-01-24', '2031-12-24', 'upcoming', true, false, 'ADMIN001', '2025-08-23 17:39:00.596881', '2025-08-23 17:39:00.596881', 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, '2025-08-23 17:39:00.596881', NULL, NULL);


--
-- TOC entry 3465 (class 0 OID 16503)
-- Dependencies: 222
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Users" VALUES ('USR001', 'admin', 'LYDO001', NULL, NULL, '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR002', 'lydo_staff', 'LYDO002', NULL, NULL, '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR003', 'lydo_staff', 'LYDO003', NULL, NULL, '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR004', 'lydo_staff', 'LYDO004', NULL, NULL, '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR005', 'lydo_staff', 'LYDO005', NULL, NULL, '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR006', 'lydo_staff', 'LYDO006', NULL, NULL, '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR007', 'sk_official', NULL, 'SK001', NULL, '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR008', 'sk_official', NULL, 'SK002', NULL, '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR009', 'sk_official', NULL, 'SK003', NULL, '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR010', 'sk_official', NULL, 'SK004', NULL, '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR011', 'sk_official', NULL, 'SK005', NULL, '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR012', 'youth', NULL, NULL, 'YTH001', '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR013', 'youth', NULL, NULL, 'YTH002', '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR014', 'youth', NULL, NULL, 'YTH003', '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR015', 'youth', NULL, NULL, 'YTH004', '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR016', 'youth', NULL, NULL, 'YTH005', '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR017', 'youth', NULL, NULL, 'YTH006', '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR018', 'youth', NULL, NULL, 'YTH007', '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR019', 'youth', NULL, NULL, 'YTH008', '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR020', 'youth', NULL, NULL, 'YTH009', '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR021', 'youth', NULL, NULL, 'YTH010', '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR022', 'youth', NULL, NULL, 'YTH011', '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR023', 'youth', NULL, NULL, 'YTH012', '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR024', 'youth', NULL, NULL, 'YTH013', '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR025', 'youth', NULL, NULL, 'YTH014', '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('USR026', 'youth', NULL, NULL, 'YTH015', '2025-08-10 08:20:57.552794', '2025-08-10 08:20:57.552794');
INSERT INTO public."Users" VALUES ('TESTUSER001', 'admin', 'TEST001', NULL, NULL, '2025-08-10 08:21:54.967636', '2025-08-10 08:21:54.967636');
INSERT INTO public."Users" VALUES ('TESTUSER002', 'sk_official', NULL, 'TEST002', NULL, '2025-08-10 08:21:55.052466', '2025-08-10 08:21:55.052466');
INSERT INTO public."Users" VALUES ('TESTUSER003', 'lydo_staff', 'TEST003', NULL, NULL, '2025-08-10 08:21:55.159012', '2025-08-10 08:21:55.159012');
INSERT INTO public."Users" VALUES ('USR027', 'sk_official', NULL, 'SK017', NULL, '2025-08-21 07:39:43.5055', '2025-08-21 07:39:43.5055');
INSERT INTO public."Users" VALUES ('USR028', 'sk_official', NULL, 'SK018', NULL, '2025-08-21 07:39:44.373581', '2025-08-21 07:39:44.373581');
INSERT INTO public."Users" VALUES ('USR029', 'sk_official', NULL, 'SK019', NULL, '2025-08-21 07:39:45.18404', '2025-08-21 07:39:45.18404');
INSERT INTO public."Users" VALUES ('USR030', 'sk_official', NULL, 'SK020', NULL, '2025-08-21 07:39:47.399402', '2025-08-21 07:39:47.399402');
INSERT INTO public."Users" VALUES ('USR031', 'lydo_staff', 'LYDO013', NULL, NULL, '2025-08-29 07:53:28.253925', '2025-08-29 07:53:28.253925');
INSERT INTO public."Users" VALUES ('USR032', 'sk_official', NULL, 'SK021', NULL, '2025-09-03 17:35:38.370719', '2025-09-03 17:35:38.370719');


--
-- TOC entry 3469 (class 0 OID 16564)
-- Dependencies: 226
-- Data for Name: Validation_Logs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Validation_Logs" VALUES ('LOG001', 'RES001', 'SK001', 'validate', 'final', 'All information verified and accurate', '2023-02-15 10:30:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG002', 'RES002', 'SK001', 'validate', 'final', 'Complete and accurate response', '2023-02-16 14:20:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG003', 'RES003', 'SK001', 'validate', 'final', 'Employment status verified', '2023-02-17 09:15:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG004', 'RES004', 'SK002', 'validate', 'final', 'Valid response from youth', '2023-02-18 11:45:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG005', 'RES005', 'SK002', 'validate', 'final', 'Job search status confirmed', '2023-02-19 16:30:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG006', 'RES006', 'SK001', 'validate', 'final', 'Employment verified', '2023-05-10 13:20:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG007', 'RES007', 'SK002', 'validate', 'final', 'Complete information provided', '2023-05-11 10:15:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG008', 'RES008', 'SK001', 'validate', 'final', 'Self-employment verified', '2024-02-20 14:45:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG009', 'RES009', 'SK002', 'validate', 'final', 'Response validated', '2024-02-21 11:30:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG010', 'RES010', 'SK003', 'validate', 'final', 'Complete information', '2024-02-22 09:20:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG011', 'RES011', 'SK003', 'validate', 'manual', 'Pending final review', '2024-04-15 15:30:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG012', 'RES012', 'SK003', 'validate', 'manual', 'Employment verified', '2024-04-16 10:45:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG013', 'RES001', 'SK001', 'validate', 'manual', 'All information verified and correct', '2023-02-15 10:30:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG014', 'RES002', 'SK001', 'validate', 'manual', 'Survey response validated', '2023-02-16 14:20:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG015', 'RES003', 'SK002', 'validate', 'manual', 'Information confirmed with youth', '2023-02-17 09:15:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG016', 'RES004', 'SK002', 'reject', 'manual', 'Incomplete information, needs resubmission', '2023-02-18 11:45:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG017', 'RES005', 'SK003', 'validate', 'manual', 'Survey validated successfully', '2023-02-19 16:30:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG018', 'RES006', 'SK001', 'validate', 'manual', 'Validated after review', '2023-05-10 13:20:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG019', 'RES007', 'SK002', 'validate', 'manual', 'All information correct', '2023-05-11 10:15:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG020', 'RES008', 'SK001', 'validate', 'manual', 'Survey validated', '2024-02-20 14:45:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG021', 'RES009', 'SK002', 'validate', 'manual', 'Response validated', '2024-02-21 11:30:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG022', 'RES010', 'SK003', 'validate', 'manual', 'Complete information', '2024-02-22 09:20:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG023', 'RES011', 'SK003', 'validate', 'manual', 'Pending final review', '2024-04-15 15:30:00');
INSERT INTO public."Validation_Logs" VALUES ('LOG024', 'RES012', 'SK003', 'validate', 'manual', 'Employment verified', '2024-04-16 10:45:00');


--
-- TOC entry 3466 (class 0 OID 16513)
-- Dependencies: 223
-- Data for Name: Voters_List; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Voters_List" VALUES ('VOT001', 'Maria', 'Santos', 'Garcia', '', '2005-03-15', 'Female', 'LYDO001', '2025-08-10 08:20:57.593632', '2025-08-10 08:20:57.593632', true);
INSERT INTO public."Voters_List" VALUES ('VOT002', 'Jose', 'Cruz', 'Reyes', 'Jr.', '2004-07-22', 'Male', 'LYDO001', '2025-08-10 08:20:57.593632', '2025-08-10 08:20:57.593632', true);
INSERT INTO public."Voters_List" VALUES ('VOT003', 'Ana', 'Mendoza', 'Lopez', '', '2003-11-08', 'Female', 'LYDO001', '2025-08-10 08:20:57.593632', '2025-08-10 08:20:57.593632', true);
INSERT INTO public."Voters_List" VALUES ('VOT004', 'Pedro', 'Villanueva', 'Torres', 'III', '2002-05-12', 'Male', 'LYDO001', '2025-08-10 08:20:57.593632', '2025-08-10 08:20:57.593632', true);
INSERT INTO public."Voters_List" VALUES ('VOT007', 'Tryyy', 'carandangdffdfmghm', NULL, NULL, '2002-01-05', 'Female', 'LYDO001', '2025-08-29 07:38:14.527619', '2025-08-29 07:38:14.527619', true);
INSERT INTO public."Voters_List" VALUES ('VOT008', 'Juan', 'Santos', 'Dela', 'Jr.', '1995-05-15', 'Male', 'LYDO001', '2025-08-29 09:26:37.522359', '2025-08-29 09:26:37.522359', true);
INSERT INTO public."Voters_List" VALUES ('VOT009', 'Maria', 'Reyes', NULL, NULL, '1998-12-20', 'Female', 'LYDO001', '2025-08-29 09:26:37.522359', '2025-08-29 09:26:37.522359', true);
INSERT INTO public."Voters_List" VALUES ('VOT010', 'Juan', 'Santos', 'Dela', 'Jr.', '1995-05-15', 'Male', 'LYDO001', '2025-08-29 09:26:51.428508', '2025-08-29 09:26:51.428508', true);
INSERT INTO public."Voters_List" VALUES ('VOT011', 'Maria', 'Reyes', NULL, NULL, '1998-12-20', 'Female', 'LYDO001', '2025-08-29 09:26:51.428508', '2025-08-29 09:26:51.428508', true);
INSERT INTO public."Voters_List" VALUES ('VOT012', 'cxcv', 'Santos', 'Dela', 'Jr.', '1995-05-15', 'Male', 'LYDO001', '2025-08-29 09:42:40.899348', '2025-08-29 09:42:40.899348', true);
INSERT INTO public."Voters_List" VALUES ('{}', 'Tryyy', 'carandangjk', NULL, NULL, '2002-01-04', 'Male', 'LYDO001', '2025-08-29 07:17:00.415566', '2025-08-29 15:29:01.351265', true);
INSERT INTO public."Voters_List" VALUES ('VOT006', 'Tryyycv', 'carandangdffdfcdhfh', NULL, NULL, '2002-01-05', 'Male', 'LYDO001', '2025-08-29 07:38:02.491339', '2025-08-30 02:51:12.472275', false);
INSERT INTO public."Voters_List" VALUES ('VOT005', 'Carmen', 'Aquino', 'Fernandez', '', '2001-09-30', 'Female', 'LYDO001', '2025-08-10 08:20:57.593632', '2025-08-30 02:51:12.46982', false);
INSERT INTO public."Voters_List" VALUES ('VOT014', 'Tryyy', 'carandanghkhk', NULL, NULL, '2000-08-30', 'Male', 'LYDO001', '2025-08-30 03:31:12.952864', '2025-08-30 03:31:39.738624', false);
INSERT INTO public."Voters_List" VALUES ('VOT013', 'vxcvcvcx', 'Reyes', NULL, NULL, '1998-12-20', 'Female', 'LYDO001', '2025-08-29 09:42:40.899348', '2025-08-30 03:31:58.584218', false);
INSERT INTO public."Voters_List" VALUES ('VOT015', 'Tryyy', 'carandanghkhkfdsfsd', NULL, NULL, '2000-08-30', 'Female', 'LYDO001', '2025-09-03 04:14:05.20465', '2025-09-03 04:14:05.20465', true);


--
-- TOC entry 3464 (class 0 OID 16485)
-- Dependencies: 221
-- Data for Name: Youth_Profiling; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Youth_Profiling" VALUES ('YTH001', 'Maria', 'Garcia', 'Santos', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB001', 'Zone 1', '2006-03-15', 18, 'Female', '+639151234572', 'maria.garcia@email.com', true, '2025-08-10 08:20:57.507351', '2025-08-10 08:20:57.507351');
INSERT INTO public."Youth_Profiling" VALUES ('YTH002', 'Jose', 'Reyes', 'Cruz', 'Jr.', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB001', 'Zone 2', '2005-07-22', 19, 'Male', '+639151234573', 'jose.reyes@email.com', true, '2025-08-10 08:20:57.507351', '2025-08-10 08:20:57.507351');
INSERT INTO public."Youth_Profiling" VALUES ('YTH003', 'Ana', 'Lopez', 'Mendoza', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB001', 'Zone 3', '2004-11-08', 20, 'Female', '+639151234574', 'ana.lopez@email.com', true, '2025-08-10 08:20:57.507351', '2025-08-10 08:20:57.507351');
INSERT INTO public."Youth_Profiling" VALUES ('YTH004', 'Pedro', 'Torres', 'Villanueva', 'III', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB001', 'Zone 1', '2003-05-12', 21, 'Male', '+639151234575', 'pedro.torres@email.com', true, '2025-08-10 08:20:57.507351', '2025-08-10 08:20:57.507351');
INSERT INTO public."Youth_Profiling" VALUES ('YTH005', 'Carmen', 'Fernandez', 'Aquino', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB001', 'Zone 2', '2002-09-30', 22, 'Female', '+639151234576', 'carmen.fernandez@email.com', true, '2025-08-10 08:20:57.507351', '2025-08-10 08:20:57.507351');
INSERT INTO public."Youth_Profiling" VALUES ('YTH006', 'Roberto', 'Santos', 'Garcia', 'Sr.', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB002', 'Zone 1', '2006-01-15', 18, 'Male', '+639151234577', 'roberto.santos@email.com', true, '2025-08-10 08:20:57.507351', '2025-08-10 08:20:57.507351');
INSERT INTO public."Youth_Profiling" VALUES ('YTH007', 'Lucia', 'Cruz', 'Reyes', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB002', 'Zone 2', '2005-04-22', 19, 'Female', '+639151234578', 'lucia.cruz@email.com', true, '2025-08-10 08:20:57.507351', '2025-08-10 08:20:57.507351');
INSERT INTO public."Youth_Profiling" VALUES ('YTH008', 'Fernando', 'Mendoza', 'Lopez', 'Jr.', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB002', 'Zone 3', '2004-08-08', 20, 'Male', '+639151234579', 'fernando.mendoza@email.com', true, '2025-08-10 08:20:57.507351', '2025-08-10 08:20:57.507351');
INSERT INTO public."Youth_Profiling" VALUES ('YTH009', 'Elena', 'Villanueva', 'Torres', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB002', 'Zone 1', '2003-12-12', 21, 'Female', '+639151234580', 'elena.villanueva@email.com', true, '2025-08-10 08:20:57.507351', '2025-08-10 08:20:57.507351');
INSERT INTO public."Youth_Profiling" VALUES ('YTH010', 'Carlos', 'Aquino', 'Fernandez', 'III', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB002', 'Zone 2', '2002-06-30', 22, 'Male', '+639151234581', 'carlos.aquino@email.com', true, '2025-08-10 08:20:57.507351', '2025-08-10 08:20:57.507351');
INSERT INTO public."Youth_Profiling" VALUES ('YTH011', 'Isabella', 'Garcia', 'Santos', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB003', 'Zone 1', '2006-02-15', 18, 'Female', '+639151234582', 'isabella.garcia@email.com', true, '2025-08-10 08:20:57.507351', '2025-08-10 08:20:57.507351');
INSERT INTO public."Youth_Profiling" VALUES ('YTH012', 'Manuel', 'Reyes', 'Cruz', 'Jr.', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB003', 'Zone 2', '2005-06-22', 19, 'Male', '+639151234583', 'manuel.reyes@email.com', true, '2025-08-10 08:20:57.507351', '2025-08-10 08:20:57.507351');
INSERT INTO public."Youth_Profiling" VALUES ('YTH013', 'Rosa', 'Lopez', 'Mendoza', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB003', 'Zone 3', '2004-10-08', 20, 'Female', '+639151234584', 'rosa.lopez@email.com', true, '2025-08-10 08:20:57.507351', '2025-08-10 08:20:57.507351');
INSERT INTO public."Youth_Profiling" VALUES ('YTH014', 'Antonio', 'Torres', 'Villanueva', 'III', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB003', 'Zone 1', '2003-04-12', 21, 'Male', '+639151234585', 'antonio.torres@email.com', true, '2025-08-10 08:20:57.507351', '2025-08-10 08:20:57.507351');
INSERT INTO public."Youth_Profiling" VALUES ('YTH015', 'Patricia', 'Fernandez', 'Aquino', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB003', 'Zone 2', '2002-08-30', 22, 'Female', '+639151234586', 'patricia.fernandez@email.com', true, '2025-08-10 08:20:57.507351', '2025-08-10 08:20:57.507351');


--
-- TOC entry 3270 (class 2606 OID 16584)
-- Name: Activity_Logs Activity_Logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Activity_Logs"
    ADD CONSTRAINT "Activity_Logs_pkey" PRIMARY KEY (log_id);


--
-- TOC entry 3287 (class 2606 OID 16613)
-- Name: Announcements Announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcements"
    ADD CONSTRAINT "Announcements_pkey" PRIMARY KEY (announcement_id);


--
-- TOC entry 3182 (class 2606 OID 16407)
-- Name: Barangay Barangay_barangay_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Barangay"
    ADD CONSTRAINT "Barangay_barangay_name_key" UNIQUE (barangay_name);


--
-- TOC entry 3184 (class 2606 OID 16405)
-- Name: Barangay Barangay_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Barangay"
    ADD CONSTRAINT "Barangay_pkey" PRIMARY KEY (barangay_id);


--
-- TOC entry 3248 (class 2606 OID 16542)
-- Name: KK_Survey_Batches KK_Survey_Batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KK_Survey_Batches"
    ADD CONSTRAINT "KK_Survey_Batches_pkey" PRIMARY KEY (batch_id);


--
-- TOC entry 3256 (class 2606 OID 16563)
-- Name: KK_Survey_Responses KK_Survey_Responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KK_Survey_Responses"
    ADD CONSTRAINT "KK_Survey_Responses_pkey" PRIMARY KEY (response_id);


--
-- TOC entry 3193 (class 2606 OID 16433)
-- Name: LYDO LYDO_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LYDO"
    ADD CONSTRAINT "LYDO_email_key" UNIQUE (email);


--
-- TOC entry 3195 (class 2606 OID 16435)
-- Name: LYDO LYDO_personal_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LYDO"
    ADD CONSTRAINT "LYDO_personal_email_key" UNIQUE (personal_email);


--
-- TOC entry 3197 (class 2606 OID 16431)
-- Name: LYDO LYDO_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LYDO"
    ADD CONSTRAINT "LYDO_pkey" PRIMARY KEY (lydo_id);


--
-- TOC entry 3277 (class 2606 OID 16598)
-- Name: Notifications Notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notifications"
    ADD CONSTRAINT "Notifications_pkey" PRIMARY KEY (notification_id);


--
-- TOC entry 3187 (class 2606 OID 16417)
-- Name: Roles Roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Roles"
    ADD CONSTRAINT "Roles_pkey" PRIMARY KEY (role_id);


--
-- TOC entry 3189 (class 2606 OID 16419)
-- Name: Roles Roles_role_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Roles"
    ADD CONSTRAINT "Roles_role_name_key" UNIQUE (role_name);


--
-- TOC entry 3224 (class 2606 OID 16484)
-- Name: SK_Officials_Profiling SK_Officials_Profiling_contact_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SK_Officials_Profiling"
    ADD CONSTRAINT "SK_Officials_Profiling_contact_number_key" UNIQUE (contact_number);


--
-- TOC entry 3226 (class 2606 OID 16482)
-- Name: SK_Officials_Profiling SK_Officials_Profiling_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SK_Officials_Profiling"
    ADD CONSTRAINT "SK_Officials_Profiling_pkey" PRIMARY KEY (profiling_id);


--
-- TOC entry 3211 (class 2606 OID 16469)
-- Name: SK_Officials SK_Officials_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SK_Officials"
    ADD CONSTRAINT "SK_Officials_email_key" UNIQUE (email);


--
-- TOC entry 3213 (class 2606 OID 16471)
-- Name: SK_Officials SK_Officials_personal_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SK_Officials"
    ADD CONSTRAINT "SK_Officials_personal_email_key" UNIQUE (personal_email);


--
-- TOC entry 3215 (class 2606 OID 16467)
-- Name: SK_Officials SK_Officials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SK_Officials"
    ADD CONSTRAINT "SK_Officials_pkey" PRIMARY KEY (sk_id);


--
-- TOC entry 3203 (class 2606 OID 16455)
-- Name: SK_Terms SK_Terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SK_Terms"
    ADD CONSTRAINT "SK_Terms_pkey" PRIMARY KEY (term_id);


--
-- TOC entry 3238 (class 2606 OID 16512)
-- Name: Users Users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY (user_id);


--
-- TOC entry 3264 (class 2606 OID 16573)
-- Name: Validation_Logs Validation_Logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Validation_Logs"
    ADD CONSTRAINT "Validation_Logs_pkey" PRIMARY KEY (log_id);


--
-- TOC entry 3244 (class 2606 OID 16522)
-- Name: Voters_List Voters_List_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Voters_List"
    ADD CONSTRAINT "Voters_List_pkey" PRIMARY KEY (voter_id);


--
-- TOC entry 3229 (class 2606 OID 16500)
-- Name: Youth_Profiling Youth_Profiling_contact_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Youth_Profiling"
    ADD CONSTRAINT "Youth_Profiling_contact_number_key" UNIQUE (contact_number);


--
-- TOC entry 3231 (class 2606 OID 16502)
-- Name: Youth_Profiling Youth_Profiling_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Youth_Profiling"
    ADD CONSTRAINT "Youth_Profiling_email_key" UNIQUE (email);


--
-- TOC entry 3233 (class 2606 OID 16498)
-- Name: Youth_Profiling Youth_Profiling_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Youth_Profiling"
    ADD CONSTRAINT "Youth_Profiling_pkey" PRIMARY KEY (youth_id);


--
-- TOC entry 3190 (class 1259 OID 16616)
-- Name: idx_active_roles; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_active_roles ON public."Roles" USING btree (is_active);


--
-- TOC entry 3271 (class 1259 OID 16654)
-- Name: idx_activity_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_action ON public."Activity_Logs" USING btree (action);


--
-- TOC entry 3272 (class 1259 OID 16656)
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created_at ON public."Activity_Logs" USING btree (created_at);


--
-- TOC entry 3273 (class 1259 OID 16655)
-- Name: idx_activity_logs_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_resource ON public."Activity_Logs" USING btree (resource_type, resource_id);


--
-- TOC entry 3274 (class 1259 OID 16652)
-- Name: idx_activity_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user_id ON public."Activity_Logs" USING btree (user_id);


--
-- TOC entry 3275 (class 1259 OID 16653)
-- Name: idx_activity_logs_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user_type ON public."Activity_Logs" USING btree (user_type);


--
-- TOC entry 3288 (class 1259 OID 16668)
-- Name: idx_announcements_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_category ON public."Announcements" USING btree (category);


--
-- TOC entry 3289 (class 1259 OID 16670)
-- Name: idx_announcements_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_created_at ON public."Announcements" USING btree (created_at);


--
-- TOC entry 3290 (class 1259 OID 16666)
-- Name: idx_announcements_is_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_is_featured ON public."Announcements" USING btree (is_featured);


--
-- TOC entry 3291 (class 1259 OID 16667)
-- Name: idx_announcements_is_pinned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_is_pinned ON public."Announcements" USING btree (is_pinned);


--
-- TOC entry 3292 (class 1259 OID 16669)
-- Name: idx_announcements_published_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_published_at ON public."Announcements" USING btree (published_at);


--
-- TOC entry 3293 (class 1259 OID 16665)
-- Name: idx_announcements_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_status ON public."Announcements" USING btree (status);


--
-- TOC entry 3185 (class 1259 OID 16614)
-- Name: idx_barangay_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_barangay_name ON public."Barangay" USING btree (barangay_name);


--
-- TOC entry 3249 (class 1259 OID 16822)
-- Name: idx_kk_batches_active_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kk_batches_active_status ON public."KK_Survey_Batches" USING btree (status) WHERE (status = 'active'::text);


--
-- TOC entry 3250 (class 1259 OID 16641)
-- Name: idx_kk_batches_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kk_batches_created_by ON public."KK_Survey_Batches" USING btree (created_by);


--
-- TOC entry 3251 (class 1259 OID 16640)
-- Name: idx_kk_batches_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kk_batches_dates ON public."KK_Survey_Batches" USING btree (start_date, end_date);


--
-- TOC entry 3252 (class 1259 OID 16820)
-- Name: idx_kk_batches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kk_batches_status ON public."KK_Survey_Batches" USING btree (status);


--
-- TOC entry 3253 (class 1259 OID 16823)
-- Name: idx_kk_batches_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kk_batches_status_created ON public."KK_Survey_Batches" USING btree (status, created_at DESC);


--
-- TOC entry 3254 (class 1259 OID 16821)
-- Name: idx_kk_batches_status_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kk_batches_status_dates ON public."KK_Survey_Batches" USING btree (status, start_date, end_date);


--
-- TOC entry 3257 (class 1259 OID 16644)
-- Name: idx_kk_responses_barangay_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kk_responses_barangay_id ON public."KK_Survey_Responses" USING btree (barangay_id);


--
-- TOC entry 3258 (class 1259 OID 16642)
-- Name: idx_kk_responses_batch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kk_responses_batch_id ON public."KK_Survey_Responses" USING btree (batch_id);


--
-- TOC entry 3259 (class 1259 OID 16647)
-- Name: idx_kk_responses_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kk_responses_created_at ON public."KK_Survey_Responses" USING btree (created_at);


--
-- TOC entry 3260 (class 1259 OID 16645)
-- Name: idx_kk_responses_validation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kk_responses_validation_status ON public."KK_Survey_Responses" USING btree (validation_status);


--
-- TOC entry 3261 (class 1259 OID 16646)
-- Name: idx_kk_responses_validation_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kk_responses_validation_tier ON public."KK_Survey_Responses" USING btree (validation_tier);


--
-- TOC entry 3262 (class 1259 OID 16643)
-- Name: idx_kk_responses_youth_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kk_responses_youth_id ON public."KK_Survey_Responses" USING btree (youth_id);


--
-- TOC entry 3198 (class 1259 OID 16619)
-- Name: idx_lydo_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lydo_active ON public."LYDO" USING btree (is_active);


--
-- TOC entry 3199 (class 1259 OID 16620)
-- Name: idx_lydo_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lydo_created_by ON public."LYDO" USING btree (created_by);


--
-- TOC entry 3200 (class 1259 OID 16617)
-- Name: idx_lydo_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lydo_email ON public."LYDO" USING btree (email);


--
-- TOC entry 3201 (class 1259 OID 16618)
-- Name: idx_lydo_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lydo_role_id ON public."LYDO" USING btree (role_id);


--
-- TOC entry 3278 (class 1259 OID 16659)
-- Name: idx_notifications_barangay_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_barangay_id ON public."Notifications" USING btree (barangay_id);


--
-- TOC entry 3279 (class 1259 OID 16663)
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public."Notifications" USING btree (created_at);


--
-- TOC entry 3280 (class 1259 OID 16664)
-- Name: idx_notifications_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_expires_at ON public."Notifications" USING btree (expires_at);


--
-- TOC entry 3281 (class 1259 OID 16662)
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public."Notifications" USING btree (is_read);


--
-- TOC entry 3282 (class 1259 OID 16661)
-- Name: idx_notifications_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_priority ON public."Notifications" USING btree (priority);


--
-- TOC entry 3283 (class 1259 OID 16660)
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public."Notifications" USING btree (type);


--
-- TOC entry 3284 (class 1259 OID 16657)
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public."Notifications" USING btree (user_id);


--
-- TOC entry 3285 (class 1259 OID 16658)
-- Name: idx_notifications_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_type ON public."Notifications" USING btree (user_type);


--
-- TOC entry 3191 (class 1259 OID 16615)
-- Name: idx_role_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_name ON public."Roles" USING btree (role_name);


--
-- TOC entry 3216 (class 1259 OID 16773)
-- Name: idx_sk_officials_account_access; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sk_officials_account_access ON public."SK_Officials" USING btree (account_access, account_access_updated_at);


--
-- TOC entry 3217 (class 1259 OID 16630)
-- Name: idx_sk_officials_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sk_officials_active ON public."SK_Officials" USING btree (is_active);


--
-- TOC entry 3218 (class 1259 OID 16628)
-- Name: idx_sk_officials_barangay_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sk_officials_barangay_id ON public."SK_Officials" USING btree (barangay_id);


--
-- TOC entry 3219 (class 1259 OID 16626)
-- Name: idx_sk_officials_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sk_officials_email ON public."SK_Officials" USING btree (email);


--
-- TOC entry 3220 (class 1259 OID 16625)
-- Name: idx_sk_officials_full_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sk_officials_full_name ON public."SK_Officials" USING btree (last_name, first_name, middle_name, suffix);


--
-- TOC entry 3221 (class 1259 OID 16627)
-- Name: idx_sk_officials_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sk_officials_role_id ON public."SK_Officials" USING btree (role_id);


--
-- TOC entry 3222 (class 1259 OID 16629)
-- Name: idx_sk_officials_term_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sk_officials_term_id ON public."SK_Officials" USING btree (term_id);


--
-- TOC entry 3227 (class 1259 OID 16631)
-- Name: idx_sk_profiling_sk_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sk_profiling_sk_id ON public."SK_Officials_Profiling" USING btree (sk_id);


--
-- TOC entry 3204 (class 1259 OID 16624)
-- Name: idx_sk_terms_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sk_terms_active ON public."SK_Terms" USING btree (is_active);


--
-- TOC entry 3205 (class 1259 OID 16763)
-- Name: idx_sk_terms_completion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sk_terms_completion ON public."SK_Terms" USING btree (completion_type, completed_at);


--
-- TOC entry 3206 (class 1259 OID 16622)
-- Name: idx_sk_terms_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sk_terms_dates ON public."SK_Terms" USING btree (start_date, end_date);


--
-- TOC entry 3207 (class 1259 OID 16623)
-- Name: idx_sk_terms_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sk_terms_status ON public."SK_Terms" USING btree (status);


--
-- TOC entry 3208 (class 1259 OID 16764)
-- Name: idx_sk_terms_status_changes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sk_terms_status_changes ON public."SK_Terms" USING btree (last_status_change_at, last_status_change_by);


--
-- TOC entry 3209 (class 1259 OID 16621)
-- Name: idx_sk_terms_term_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sk_terms_term_name ON public."SK_Terms" USING btree (term_name);


--
-- TOC entry 3239 (class 1259 OID 16636)
-- Name: idx_users_lydo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_lydo_id ON public."Users" USING btree (lydo_id);


--
-- TOC entry 3240 (class 1259 OID 16637)
-- Name: idx_users_sk_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_sk_id ON public."Users" USING btree (sk_id);


--
-- TOC entry 3241 (class 1259 OID 16635)
-- Name: idx_users_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_user_type ON public."Users" USING btree (user_type);


--
-- TOC entry 3242 (class 1259 OID 16638)
-- Name: idx_users_youth_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_youth_id ON public."Users" USING btree (youth_id);


--
-- TOC entry 3265 (class 1259 OID 16648)
-- Name: idx_validation_logs_response_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_logs_response_id ON public."Validation_Logs" USING btree (response_id);


--
-- TOC entry 3266 (class 1259 OID 16649)
-- Name: idx_validation_logs_validated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_logs_validated_by ON public."Validation_Logs" USING btree (validated_by);


--
-- TOC entry 3267 (class 1259 OID 16650)
-- Name: idx_validation_logs_validation_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_logs_validation_action ON public."Validation_Logs" USING btree (validation_action);


--
-- TOC entry 3268 (class 1259 OID 16651)
-- Name: idx_validation_logs_validation_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_logs_validation_date ON public."Validation_Logs" USING btree (validation_date);


--
-- TOC entry 3245 (class 1259 OID 16784)
-- Name: idx_voters_list_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voters_list_active ON public."Voters_List" USING btree (is_active);


--
-- TOC entry 3246 (class 1259 OID 16639)
-- Name: idx_voters_list_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voters_list_name ON public."Voters_List" USING btree (first_name, last_name);


--
-- TOC entry 3234 (class 1259 OID 16634)
-- Name: idx_youth_profiling_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youth_profiling_active ON public."Youth_Profiling" USING btree (is_active);


--
-- TOC entry 3235 (class 1259 OID 16633)
-- Name: idx_youth_profiling_age; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youth_profiling_age ON public."Youth_Profiling" USING btree (age);


--
-- TOC entry 3236 (class 1259 OID 16632)
-- Name: idx_youth_profiling_barangay_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youth_profiling_barangay_id ON public."Youth_Profiling" USING btree (barangay_id);


--
-- TOC entry 3308 (class 2620 OID 16829)
-- Name: KK_Survey_Batches trigger_batch_pause_timestamps; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_batch_pause_timestamps BEFORE UPDATE ON public."KK_Survey_Batches" FOR EACH ROW EXECUTE FUNCTION public.update_batch_pause_timestamps();


--
-- TOC entry 3311 (class 2620 OID 16682)
-- Name: Announcements update_announcements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public."Announcements" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3299 (class 2620 OID 16671)
-- Name: Barangay update_barangay_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_barangay_updated_at BEFORE UPDATE ON public."Barangay" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3309 (class 2620 OID 16680)
-- Name: KK_Survey_Batches update_kk_batches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kk_batches_updated_at BEFORE UPDATE ON public."KK_Survey_Batches" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3310 (class 2620 OID 16681)
-- Name: KK_Survey_Responses update_kk_responses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kk_responses_updated_at BEFORE UPDATE ON public."KK_Survey_Responses" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3301 (class 2620 OID 16673)
-- Name: LYDO update_lydo_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lydo_updated_at BEFORE UPDATE ON public."LYDO" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3300 (class 2620 OID 16672)
-- Name: Roles update_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public."Roles" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3303 (class 2620 OID 16675)
-- Name: SK_Officials update_sk_officials_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sk_officials_updated_at BEFORE UPDATE ON public."SK_Officials" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3304 (class 2620 OID 16676)
-- Name: SK_Officials_Profiling update_sk_profiling_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sk_profiling_updated_at BEFORE UPDATE ON public."SK_Officials_Profiling" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3302 (class 2620 OID 16674)
-- Name: SK_Terms update_sk_terms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sk_terms_updated_at BEFORE UPDATE ON public."SK_Terms" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3306 (class 2620 OID 16678)
-- Name: Users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public."Users" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3307 (class 2620 OID 16679)
-- Name: Voters_List update_voters_list_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_voters_list_updated_at BEFORE UPDATE ON public."Voters_List" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3305 (class 2620 OID 16677)
-- Name: Youth_Profiling update_youth_profiling_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_youth_profiling_updated_at BEFORE UPDATE ON public."Youth_Profiling" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3297 (class 2606 OID 16810)
-- Name: KK_Survey_Batches fk_kk_batches_paused_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KK_Survey_Batches"
    ADD CONSTRAINT fk_kk_batches_paused_by FOREIGN KEY (paused_by) REFERENCES public."LYDO"(lydo_id) ON DELETE SET NULL;


--
-- TOC entry 3298 (class 2606 OID 16815)
-- Name: KK_Survey_Batches fk_kk_batches_resumed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KK_Survey_Batches"
    ADD CONSTRAINT fk_kk_batches_resumed_by FOREIGN KEY (resumed_by) REFERENCES public."LYDO"(lydo_id) ON DELETE SET NULL;


--
-- TOC entry 3296 (class 2606 OID 16768)
-- Name: SK_Officials fk_sk_officials_account_access_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SK_Officials"
    ADD CONSTRAINT fk_sk_officials_account_access_by FOREIGN KEY (account_access_updated_by) REFERENCES public."LYDO"(lydo_id) ON DELETE SET NULL;


--
-- TOC entry 3294 (class 2606 OID 16753)
-- Name: SK_Terms fk_sk_terms_completed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SK_Terms"
    ADD CONSTRAINT fk_sk_terms_completed_by FOREIGN KEY (completed_by) REFERENCES public."LYDO"(lydo_id) ON DELETE SET NULL;


--
-- TOC entry 3295 (class 2606 OID 16758)
-- Name: SK_Terms fk_sk_terms_status_change_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SK_Terms"
    ADD CONSTRAINT fk_sk_terms_status_change_by FOREIGN KEY (last_status_change_by) REFERENCES public."LYDO"(lydo_id) ON DELETE SET NULL;


-- Completed on 2025-09-08 16:11:13

--
-- PostgreSQL database dump complete
--

