interface AlreadyRespondedProps {
  metadata?: string;
}

const DEFAULT_TITLE = 'Already Responded';
const DEFAULT_ALREADY_RESPONDED_MESSAGE =
  'You have already submitted a response for this form.';

function getAlreadyRespondedMessage(metadata?: string): string {
  if (!metadata) {
    return DEFAULT_ALREADY_RESPONDED_MESSAGE;
  }

  try {
    const parsedMetadata = JSON.parse(metadata) as unknown;

    if (typeof parsedMetadata !== 'object' || parsedMetadata === null) {
      return DEFAULT_ALREADY_RESPONDED_MESSAGE;
    }

    const parsedMetadataObject = parsedMetadata as {
      alreadyResponded?: { message?: string };
    };

    const nestedMessage = parsedMetadataObject.alreadyResponded?.message?.trim();
    return nestedMessage || DEFAULT_ALREADY_RESPONDED_MESSAGE;
  } catch {
    return DEFAULT_ALREADY_RESPONDED_MESSAGE;
  }
}

export default function AlreadyResponded({ metadata }: AlreadyRespondedProps) {
  const message = getAlreadyRespondedMessage(metadata);

  return (
    <div className='flex min-h-screen items-center justify-center p-6'>
      <div className='w-full max-w-2xl rounded-lg border bg-background p-8 text-center shadow-sm'>
        <h1 className='text-2xl font-semibold'>{DEFAULT_TITLE}</h1>
        <p className='mt-4 text-muted-foreground'>{message}</p>
      </div>
    </div>
  );
}
