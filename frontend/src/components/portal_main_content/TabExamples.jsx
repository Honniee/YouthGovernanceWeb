import React from 'react';
import { Users, UserCheck, UserX, Settings, Calendar, FileText } from 'lucide-react';
import { TabContainer, Tab, useTabState } from './index';

/**
 * Examples of how to use the Tab components
 * This file demonstrates various use cases and configurations
 */

// Example 1: Basic Staff Management Tabs (like current StaffManagement)
export const StaffManagementTabs = ({ staffStats, onTabChange }) => {
  const { activeTab, setActiveTab } = useTabState('all', onTabChange);

  return (
    <TabContainer
      activeTab={activeTab}
      onTabChange={setActiveTab}
      variant="underline"
      size="md"
    >
      <Tab 
        id="all" 
        label="All Staff" 
        shortLabel="All"
        count={staffStats?.total || 0} 
        color="blue"
      />
      <Tab 
        id="active" 
        label="Active" 
        count={staffStats?.active || 0} 
        color="green"
      />
      <Tab 
        id="deactivated" 
        label="Deactivated" 
        count={staffStats?.deactivated || 0} 
        color="yellow"
      />
    </TabContainer>
  );
};

// Example 2: User Management with Icons
export const UserManagementTabs = ({ userStats, onTabChange }) => {
  const { activeTab, setActiveTab } = useTabState('all', onTabChange);

  return (
    <TabContainer
      activeTab={activeTab}
      onTabChange={setActiveTab}
      variant="underline"
      size="md"
    >
      <Tab 
        id="all" 
        label="All Users" 
        shortLabel="All"
        count={userStats?.total || 0} 
        color="blue"
        icon={<Users className="w-4 h-4" />}
      />
      <Tab 
        id="active" 
        label="Active Users" 
        shortLabel="Active"
        count={userStats?.active || 0} 
        color="green"
        icon={<UserCheck className="w-4 h-4" />}
      />
      <Tab 
        id="inactive" 
        label="Inactive Users" 
        shortLabel="Inactive"
        count={userStats?.inactive || 0} 
        color="red"
        icon={<UserX className="w-4 h-4" />}
      />
    </TabContainer>
  );
};

// Example 3: Pill Style Tabs
export const SettingsTabs = ({ activeSection, onSectionChange }) => {
  return (
    <TabContainer
      activeTab={activeSection}
      onTabChange={onSectionChange}
      variant="pills"
      size="sm"
      showBorder={false}
      backgroundColor="bg-gray-50"
    >
      <Tab 
        id="general" 
        label="General" 
        color="blue"
        icon={<Settings className="w-3 h-3" />}
        showCount={false}
      />
      <Tab 
        id="security" 
        label="Security" 
        color="red"
        showCount={false}
      />
      <Tab 
        id="notifications" 
        label="Notifications" 
        color="yellow"
        count={3}
      />
      <Tab 
        id="integrations" 
        label="Integrations" 
        color="purple"
        showCount={false}
      />
    </TabContainer>
  );
};

// Example 4: Button Style Tabs
export const ReportsTabs = ({ selectedPeriod, onPeriodChange, reportCounts }) => {
  return (
    <TabContainer
      activeTab={selectedPeriod}
      onTabChange={onPeriodChange}
      variant="buttons"
      size="lg"
      showBorder={false}
      className="p-4"
    >
      <Tab 
        id="daily" 
        label="Daily Reports" 
        shortLabel="Daily"
        count={reportCounts?.daily || 0} 
        color="blue"
        icon={<Calendar className="w-5 h-5" />}
      />
      <Tab 
        id="weekly" 
        label="Weekly Reports" 
        shortLabel="Weekly"
        count={reportCounts?.weekly || 0} 
        color="green"
        icon={<FileText className="w-5 h-5" />}
      />
      <Tab 
        id="monthly" 
        label="Monthly Reports" 
        shortLabel="Monthly"
        count={reportCounts?.monthly || 0} 
        color="purple"
        icon={<FileText className="w-5 h-5" />}
      />
    </TabContainer>
  );
};

// Example 5: Complex Youth Management Tabs
export const YouthManagementTabs = ({ youthStats, onTabChange }) => {
  const { activeTab, setActiveTab } = useTabState('all', onTabChange);

  return (
    <TabContainer
      activeTab={activeTab}
      onTabChange={setActiveTab}
      variant="underline"
      size="md"
    >
      <Tab 
        id="all" 
        label="All Youth" 
        shortLabel="All"
        count={youthStats?.total || 0} 
        color="blue"
      />
      <Tab 
        id="active" 
        label="Active Members" 
        shortLabel="Active"
        count={youthStats?.active || 0} 
        color="green"
      />
      <Tab 
        id="graduated" 
        label="Graduated" 
        count={youthStats?.graduated || 0} 
        color="purple"
      />
      <Tab 
        id="inactive" 
        label="Inactive" 
        count={youthStats?.inactive || 0} 
        color="yellow"
      />
    </TabContainer>
  );
};

// Example 6: Simple usage without counts
export const SimpleTabs = ({ activeTab, onTabChange }) => {
  return (
    <TabContainer
      activeTab={activeTab}
      onTabChange={onTabChange}
      variant="underline"
      size="sm"
    >
      <Tab id="overview" label="Overview" color="blue" showCount={false} />
      <Tab id="details" label="Details" color="green" showCount={false} />
      <Tab id="history" label="History" color="gray" showCount={false} />
    </TabContainer>
  );
};

export default {
  StaffManagementTabs,
  UserManagementTabs,
  SettingsTabs,
  ReportsTabs,
  YouthManagementTabs,
  SimpleTabs
};






























