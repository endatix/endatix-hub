'use client';

import { Check, ChevronsUpDown, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/loaders/spinner';
import { getTemplatesAction } from '@/features/form-templates/application/get-templates.action';
import { useMediaQuery } from '@/lib/utils/hooks/use-media-query';

interface TemplateSelectorProps {
  onTemplateSelect: (template: FormTemplate) => void;
  onPreviewTemplate: (templateId: string) => void;
}

export default function TemplateSelector({
  onTemplateSelect,
  onPreviewTemplate,
}: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTemplatesAction();
        setTemplates(data);
        setFilteredTemplates(data);
      } catch (err) {
        setError('Failed to load templates');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // Filter templates when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTemplates(templates);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = templates.filter(
      template => 
        template.name.toLowerCase().includes(query) || 
        (template.description && template.description.toLowerCase().includes(query))
    );
    setFilteredTemplates(filtered);
  }, [searchQuery, templates]);

  const handleSelectTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    onTemplateSelect(template);
    setOpen(false);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  if (isDesktop) {
    return (
      <div className="flex flex-col w-full gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedTemplate
                ? selectedTemplate.name
                : 'Select a template...'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <TemplateList 
              templates={filteredTemplates}
              loading={loading}
              error={error}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={handleSelectTemplate}
              onPreviewTemplate={onPreviewTemplate}
              onSearch={handleSearch}
              searchQuery={searchQuery}
            />
          </PopoverContent>
        </Popover>
        {selectedTemplate && (
          <div className="text-sm text-muted-foreground">
            {selectedTemplate.description || 'No description available.'}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-2">
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between"
          >
            {selectedTemplate
              ? selectedTemplate.name
              : 'Select a template...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              Choose a template for your form
            </DrawerTitle>
          </DrawerHeader>
          <div className="mt-4 border-t">
            <TemplateList 
              templates={filteredTemplates}
              loading={loading}
              error={error}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={handleSelectTemplate}
              onPreviewTemplate={onPreviewTemplate}
              onSearch={handleSearch}
              searchQuery={searchQuery}
            />
          </div>
        </DrawerContent>
      </Drawer>
      {selectedTemplate && (
        <div className="text-sm text-muted-foreground">
          {selectedTemplate.description || 'No description available.'}
        </div>
      )}
    </div>
  );
}

interface TemplateListProps {
  templates: FormTemplate[];
  loading: boolean;
  error: string | null;
  selectedTemplate: FormTemplate | null;
  onSelectTemplate: (template: FormTemplate) => void;
  onPreviewTemplate: (templateId: string) => void;
  onSearch: (value: string) => void;
  searchQuery: string;
}

function TemplateList({
  templates,
  loading,
  error,
  selectedTemplate,
  onSelectTemplate,
  onPreviewTemplate,
  onSearch,
  searchQuery,
}: TemplateListProps) {
  const [hoveredTemplateId, setHoveredTemplateId] = useState<string | null>(null);

  return (
    <Command shouldFilter={false}>
      <CommandInput 
        placeholder="Search templates..." 
        value={searchQuery}
        onValueChange={onSearch}
      />
      <CommandList>
        {loading ? (
          <div className="flex justify-center items-center py-6">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <CommandEmpty>{error}</CommandEmpty>
        ) : templates.length === 0 ? (
          <CommandEmpty>No templates found.</CommandEmpty>
        ) : (
          <CommandGroup>
            {templates.map((template) => (
              <CommandItem
                key={template.id}
                value={template.id}
                onSelect={() => onSelectTemplate(template)}
                onMouseEnter={() => setHoveredTemplateId(template.id)}
                onMouseLeave={() => setHoveredTemplateId(null)}
                className="flex items-center justify-between h-[60px]"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 flex-shrink-0',
                      selectedTemplate?.id === template.id
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col truncate">
                    <span className="truncate">{template.name}</span>
                    {template.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {template.description}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 w-10">
                  {hoveredTemplateId === template.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        onSelectTemplate(template)
                        e.stopPropagation();
                        onPreviewTemplate(template.id);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
} 