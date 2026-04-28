'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import type { DataListDetails } from '@/lib/endatix-api/data-lists/types';
import { getFormattedDate } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ReplaceItemsDialog } from './replace-items-dialog';

interface DataListDetailsPageProps {
  initialDetails: DataListDetails;
  openReplaceOnLoad?: boolean;
}

export function DataListDetailsPage({
  initialDetails,
  openReplaceOnLoad = false,
}: DataListDetailsPageProps) {
  const [details, setDetails] = useState(initialDetails);
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(openReplaceOnLoad);

  useEffect(() => {
    if (openReplaceOnLoad) {
      setIsReplaceDialogOpen(true);
    }
  }, [openReplaceOnLoad]);

  return (
    <>
      <div className='mb-4'>
        <Button variant='outline' asChild>
          <Link href='/data-lists'>
            <ArrowLeft className='h-4 w-4' />
            Back to Data Lists
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className='flex flex-row items-start justify-between gap-4'>
          <div className='space-y-2'>
            <CardTitle className='text-2xl'>{details.name}</CardTitle>
            <p className='text-sm text-muted-foreground'>
              {details.description || 'No description'}
            </p>
            <div className='flex gap-4 text-xs text-muted-foreground'>
              <span>Created: {getFormattedDate(details.createdAt ?? null)}</span>
              <span>Modified: {getFormattedDate(details.modifiedAt ?? null)}</span>
            </div>
          </div>

          <Button onClick={() => setIsReplaceDialogOpen(true)}>Replace Items</Button>
        </CardHeader>
        <CardContent>
          {details.items.length === 0 ? (
            <div className='rounded-lg border border-dashed p-10 text-center'>
              <p className='text-sm text-muted-foreground'>No items in this list.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.items.map((item, index) => (
                  <TableRow key={`${item.value}-${index}`}>
                    <TableCell>{item.label}</TableCell>
                    <TableCell className='font-mono text-xs'>{item.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ReplaceItemsDialog
        open={isReplaceDialogOpen}
        onOpenChange={setIsReplaceDialogOpen}
        dataListId={String(details.id)}
        title={details.name}
        onReplaced={(updated) => {
          setDetails(updated);
          toast.success('Data list details updated');
        }}
      />
    </>
  );
}
