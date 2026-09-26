'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import type { SignupRequestListItem } from '@/lib/endatix-api/signup-requests/types';
import { Result } from '@/lib/result';
import { useEffect, useState, useTransition } from 'react';
import { rejectSignupRequestAction } from '../signup-requests.actions';

interface RejectSignupRequestDialogProps {
  request: SignupRequestListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RejectSignupRequestDialog({
  request,
  open,
  onOpenChange,
}: Readonly<RejectSignupRequestDialogProps>) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    setComment('');
    setError(null);
  }, [open, request?.id]);

  const handleReject = () => {
    if (!request) {
      return;
    }

    startTransition(async () => {
      const result = await rejectSignupRequestAction(request.id, comment);
      if (Result.isError(result)) {
        setError(result.message);
        return;
      }

      toast.success('Signup request rejected.');
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject signup request</DialogTitle>
          <DialogDescription>
            Record an internal comment for {request?.email}. The requester will
            not be emailed.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="rejectComment">Comment</Label>
          <Textarea
            id="rejectComment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isPending || !comment.trim()}
          >
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
