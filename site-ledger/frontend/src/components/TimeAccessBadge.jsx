import { useState, useEffect } from 'react';

/**
 * Displays time-based access information for entries.
 * Shows remaining time and access status (can view/edit/delete).
 */
export default function TimeAccessBadge({ createdAt, role, isOwnerOrAdmin }) {
  const [timeInfo, setTimeInfo] = useState(null);

  useEffect(() => {
    if (!createdAt || isOwnerOrAdmin) {
      setTimeInfo({ label: 'Unlimited', type: 'unlimited' });
      return;
    }

    const updateTime = () => {
      const created = new Date(createdAt);
      const now = new Date();
      const diffMs = now - created;
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffMinutes = diffMs / (1000 * 60);

      let label, type;

      if (role === 'SITE_INCHARGE') {
        // 5 days (120 hours) window for Site Incharge
        const remainingHours = 120 - diffHours;
        if (remainingHours <= 0) {
          label = 'Expired';
          type = 'expired';
        } else if (remainingHours < 24) {
          label = `${Math.round(remainingHours)}h remaining`;
          type = 'warning';
        } else {
          label = `${Math.round(remainingHours / 24)}d remaining`;
          type = 'active';
        }
      } else if (role === 'MUNSHI' || role === 'MATE') {
        // 24 hours window
        const remainingHours = 24 - diffHours;
        if (remainingHours <= 0) {
          label = 'Expired';
          type = 'expired';
        } else if (remainingHours < 6) {
          label = `${Math.round(remainingHours * 60)}min remaining`;
          type = 'warning';
        } else {
          label = `${Math.round(remainingHours)}h remaining`;
          type = 'active';
        }
      } else {
        label = 'No Access';
        type = 'expired';
      }

      setTimeInfo({ label, type });
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [createdAt, role, isOwnerOrAdmin]);

  if (!timeInfo) return null;

  const colorMap = {
    unlimited: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    expired: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorMap[timeInfo.type] || 'bg-gray-100 text-gray-700'}`}>
      {timeInfo.label}
    </span>
  );
}
