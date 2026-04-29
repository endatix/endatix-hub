interface AlreadyRespondedProps {
  message: string;
}

const DEFAULT_TITLE = 'Already Responded';

export default function AlreadyResponded({ message }: AlreadyRespondedProps) {
  return (
    <div className='flex min-h-screen items-center justify-center p-6'>
      <div className='w-full max-w-2xl rounded-lg border bg-background p-8 text-center shadow-sm'>
        <h1 className='text-2xl font-semibold'>{DEFAULT_TITLE}</h1>
        <p className='mt-4 text-muted-foreground'>{message}</p>
      </div>
    </div>
  );
}
