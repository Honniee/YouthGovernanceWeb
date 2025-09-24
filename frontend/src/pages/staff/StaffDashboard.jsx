import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  SortAsc, 
  Grid3X3, 
  List, 
  MoreHorizontal,
  Download,
  Trash2,
  Edit,
  Eye,
  Plus,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';


const StaffDashboard = () => {
  const [activeTab, setActiveTab] = useState('sk-officials');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  

  return (
    <div className="space-y-7">
      
      

      

      

      
    </div>
  );
};

export default StaffDashboard;

