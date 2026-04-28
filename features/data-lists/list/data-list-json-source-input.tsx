'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Download, FileUp } from 'lucide-react';

interface DataListJsonSourceInputProps {
  tabValue: string;
  onTabChange: (tab: string) => void;
  jsonInput: string;
  onJsonInputChange: (value: string) => void;
  onFileSelected: (file: File | null) => void;
  selectedFileName?: string | null;
  fileInputId: string;
}

export function DataListJsonSourceInput({
  tabValue,
  onTabChange,
  jsonInput,
  onJsonInputChange,
  onFileSelected,
  selectedFileName,
  fileInputId,
}: DataListJsonSourceInputProps) {
  return (
    <Tabs value={tabValue} onValueChange={onTabChange}>
      <TabsList variant='line' className='w-full justify-start'>
        <TabsTrigger value='upload'>Upload JSON</TabsTrigger>
        <TabsTrigger value='paste'>Paste JSON</TabsTrigger>
      </TabsList>

      <TabsContent value='upload' className='space-y-4 pt-2'>
        <label
          htmlFor={fileInputId}
          className='flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center transition hover:bg-muted/40'
        >
          <FileUp className='mb-2 h-5 w-5 text-muted-foreground' />
          <span className='text-sm font-medium'>Drag and drop or browse JSON file</span>
          <span className='text-xs text-muted-foreground'>Max file size: 5MB</span>
        </label>
        <input
          id={fileInputId}
          type='file'
          accept='application/json,.json'
          className='hidden'
          onChange={(event) => onFileSelected(event.target.files?.item(0) ?? null)}
        />
        {selectedFileName && (
          <p className='text-xs text-muted-foreground'>Selected: {selectedFileName}</p>
        )}
        <a
          href='/templates/data-list-template.json'
          download
          className='inline-flex items-center gap-1 text-sm text-primary hover:underline'
        >
          <Download className='h-4 w-4' />
          Download template
        </a>
      </TabsContent>

      <TabsContent value='paste' className='space-y-3 pt-2'>
        <Textarea
          value={jsonInput}
          onChange={(event) => onJsonInputChange(event.target.value)}
          className='min-h-[220px] max-h-[360px] overflow-y-auto font-mono text-xs'
          placeholder='[{"label":"Option A","value":"option-a"}]'
        />
      </TabsContent>
    </Tabs>
  );
}
