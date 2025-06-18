import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { FolderDown } from 'lucide-react';
import { downloadSubmissionFilesUseCase } from '../use-cases/download-submission-files.use-case';
import { useTrackEvent } from '@/features/analytics/posthog';

interface DownloadFilesDropdownItemProps {
  formId: string;
  submissionId: string;
}

export function DownloadFilesDropdownItem({ formId, submissionId }: DownloadFilesDropdownItemProps) {
  const { trackFeatureUsage } = useTrackEvent();
  return (
    <DropdownMenuItem
      onClick={() => {
        downloadSubmissionFilesUseCase({ formId, submissionId });
        trackFeatureUsage('submissions', 'download_files', {
          formId,
          submissionId
        });
      }}
      className="cursor-pointer"
    >
      <FolderDown className="w-4 h-4 mr-2" />
      Download Files
    </DropdownMenuItem>
  );
} 