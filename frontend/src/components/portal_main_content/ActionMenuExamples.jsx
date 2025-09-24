import React from 'react';
import { Eye, Edit, Archive, Trash2, Download, Share, Settings, Users, MoreVertical } from 'lucide-react';
import { ActionMenu, useActionMenu } from './index';

/**
 * Examples of how to use the ActionMenu component
 * This file demonstrates various use cases and configurations
 */

// Example 1: Staff Management Action Menu (matches current StaffManagement)
export const StaffActionMenu = ({ item, onAction }) => {
  const items = [
    {
      id: 'view',
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      action: 'view'
    },
    {
      id: 'edit',
      label: 'Edit Staff',
      icon: <Edit className="w-4 h-4" />,
      action: 'edit'
    },
    {
      type: 'divider'
    },
    {
      id: 'deactivate',
      label: item?.isActive ? 'Deactivate' : 'Activate',
      icon: <Archive className="w-4 h-4" />,
      action: item?.isActive ? 'deactivate' : 'activate'
    }
  ];

  return (
    <ActionMenu
      items={items}
      onAction={(actionId) => onAction(actionId, item)}
      size="md"
      position="auto"
    />
  );
};

// Example 2: Data Table Action Menu with destructive actions
export const DataTableActionMenu = ({ item, onAction, canDelete = true }) => {
  const items = [
    {
      id: 'view',
      label: 'View',
      icon: <Eye className="w-4 h-4" />
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: <Edit className="w-4 h-4" />
    },
    {
      id: 'download',
      label: 'Download',
      icon: <Download className="w-4 h-4" />
    },
    {
      type: 'divider'
    },
    {
      id: 'share',
      label: 'Share',
      icon: <Share className="w-4 h-4" />
    },
    ...(canDelete ? [
      {
        type: 'divider'
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: <Trash2 className="w-4 h-4" />,
        destructive: true
      }
    ] : [])
  ];

  return (
    <ActionMenu
      items={items}
      onAction={(actionId) => onAction(actionId, item)}
      size="md"
    />
  );
};

// Example 3: Small Action Menu for compact spaces
export const CompactActionMenu = ({ item, onAction }) => {
  const items = [
    {
      id: 'edit',
      label: 'Edit',
      icon: <Edit className="w-3 h-3" />
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-3 h-3" />,
      destructive: true
    }
  ];

  return (
    <ActionMenu
      items={items}
      onAction={(actionId) => onAction(actionId, item)}
      size="sm"
      triggerIcon={<MoreVertical className="w-3 h-3" />}
      triggerClassName="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-100"
    />
  );
};

// Example 4: Custom trigger with different positioning
export const CustomActionMenu = ({ item, onAction }) => {
  const items = [
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      shortcut: '⌘S'
    },
    {
      id: 'users',
      label: 'Manage Users',
      icon: <Users className="w-4 h-4" />,
      shortcut: '⌘U'
    },
    {
      type: 'divider'
    },
    {
      id: 'advanced',
      label: 'Advanced Options',
      icon: <Settings className="w-4 h-4" />
    }
  ];

  return (
    <ActionMenu
      items={items}
      onAction={(actionId) => onAction(actionId, item)}
      size="lg"
      position="left"
      triggerIcon={<Settings className="w-5 h-5" />}
      triggerClassName="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
    />
  );
};

// Example 5: Multiple Action Menus in a list (demonstrates state management)
export const ActionMenuList = ({ items, onAction }) => {
  const { isMenuOpen, handleMenuToggle } = useActionMenu();

  const getMenuItems = (item) => [
    {
      id: 'view',
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />
    },
    {
      id: 'edit',
      label: 'Edit Item',
      icon: <Edit className="w-4 h-4" />
    },
    {
      type: 'divider'
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      destructive: true
    }
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between p-4 bg-white border rounded-lg">
          <div>
            <h3 className="font-medium">{item.name}</h3>
            <p className="text-sm text-gray-600">{item.description}</p>
          </div>
          
          <ActionMenu
            items={getMenuItems(item)}
            onAction={(actionId) => onAction(actionId, item)}
            isOpen={isMenuOpen(item.id)}
            onToggle={() => handleMenuToggle(item.id)}
          />
        </div>
      ))}
    </div>
  );
};

// Example 6: Disabled Action Menu
export const DisabledActionMenu = ({ reason = "No actions available" }) => {
  return (
    <ActionMenu
      items={[]}
      disabled={true}
      triggerClassName="text-gray-300 cursor-not-allowed p-1"
      title={reason}
    />
  );
};

export default {
  StaffActionMenu,
  DataTableActionMenu,
  CompactActionMenu,
  CustomActionMenu,
  ActionMenuList,
  DisabledActionMenu
};






























