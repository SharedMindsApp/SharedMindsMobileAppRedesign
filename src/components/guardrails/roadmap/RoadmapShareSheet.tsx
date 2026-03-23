/**
 * RoadmapShareSheet
 * 
 * Phase 1: Structural placeholder component for Roadmap sharing.
 * 
 * This component provides the structural foundation for future sharing functionality.
 * Currently contains placeholder buttons only - no real functionality yet.
 * 
 * Future functionality (Phase 2+):
 * - Share Project (opens sharing drawer)
 * - Copy Link (copies project link to clipboard)
 * - Export as Image (exports roadmap as image)
 * - Generate Report (generates PDF/HTML report)
 */

import { BottomSheet } from '../../shared/BottomSheet';
import { Share2, Copy, Image, FileText } from 'lucide-react';

interface RoadmapShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoadmapShareSheet({ isOpen, onClose }: RoadmapShareSheetProps) {
  const handleShareProject = () => {
    console.log('[RoadmapShareSheet] Share Project placeholder clicked');
    // TODO: Phase 2 - Open sharing drawer
    onClose();
  };

  const handleCopyLink = () => {
    console.log('[RoadmapShareSheet] Copy Link placeholder clicked');
    // TODO: Phase 2 - Copy link to clipboard
    onClose();
  };

  const handleExportImage = () => {
    console.log('[RoadmapShareSheet] Export as Image placeholder clicked');
    // TODO: Phase 2 - Export roadmap as image
    onClose();
  };

  const handleGenerateReport = () => {
    console.log('[RoadmapShareSheet] Generate Report placeholder clicked');
    // TODO: Phase 2 - Generate PDF/HTML report
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Share Roadmap"
      maxHeight="90vh"
      closeOnBackdrop={true}
    >
      <div className="space-y-2">
        {/* Share Project Button */}
        <button
          onClick={handleShareProject}
          className="w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[44px] flex items-center gap-3"
        >
          <Share2 size={20} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Share Project</span>
        </button>

        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className="w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[44px] flex items-center gap-3"
        >
          <Copy size={20} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Copy Link</span>
        </button>

        {/* Export as Image Button */}
        <button
          onClick={handleExportImage}
          className="w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[44px] flex items-center gap-3"
        >
          <Image size={20} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Export as Image</span>
        </button>

        {/* Generate Report Button */}
        <button
          onClick={handleGenerateReport}
          className="w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[44px] flex items-center gap-3"
        >
          <FileText size={20} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Generate Report</span>
        </button>
      </div>
    </BottomSheet>
  );
}
