'use client';
import { AgentForm } from '../types';
import { AgentFormContainer } from './agent-form';
import { updateAgentAction } from '../application/update-agent.action';
import { Result } from '@/lib/result';
import { toast } from '@/components/ui/toast';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function EditAgent({ agentId, initialValues }: { agentId: string, initialValues: AgentForm }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(data: AgentForm) {
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => formData.append(k, String(v)));
      const result = await updateAgentAction(agentId, formData);
      if (Result.isSuccess(result)) {
        toast.success({ title: 'Agent updated', description: 'Changes saved.' });
        router.push('/admin/agents');
      } else {
        toast.error(result.message || 'Failed to update agent');
      }
    });
  }

  return (
    <AgentFormContainer
      initialValues={initialValues}
      onSubmit={handleSubmit}
      mode="edit"
      isPending={isPending}
    />
  );
} 