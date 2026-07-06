import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Model } from 'survey-core';
import type {
  SurveyCreatorModel,
  SurveyInstanceCreatedEvent,
} from 'survey-creator-core';
import { bindSurveyToCreatorAreas } from '../creator-survey-bindings';

const BOUND_KEY = '__testCreatorSurveyBindingsBound';

function createMockCreator(initialSurvey?: Model) {
  let handler: ((_: unknown, options: SurveyInstanceCreatedEvent) => void) | undefined;

  const creator = {
    survey: initialSurvey ?? null,
    onSurveyInstanceCreated: {
      add: vi.fn((fn: typeof handler) => {
        handler = fn;
      }),
      remove: vi.fn(),
    },
  } as unknown as SurveyCreatorModel & Record<string, unknown>;

  return {
    creator,
    emit(area: string, survey: Model) {
      handler?.(null, { area, survey });
    },
  };
}

describe('bindSurveyToCreatorAreas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('binds only designer-tab and preview-tab survey instances', () => {
    const bindSurvey = vi.fn(() => vi.fn());
    const { creator, emit } = createMockCreator(new Model({ elements: [] }));

    bindSurveyToCreatorAreas(creator, BOUND_KEY, bindSurvey);

    expect(bindSurvey).toHaveBeenCalledTimes(1);
    expect(bindSurvey.mock.calls[0]?.[0]).toBe(creator.survey);

    const previewSurvey = new Model({ elements: [] });
    emit('preview-tab', previewSurvey);
    expect(bindSurvey).toHaveBeenCalledTimes(2);
    expect(bindSurvey.mock.calls[1]?.[0]).toBe(previewSurvey);

    emit('property-grid', new Model({ elements: [] }));
    emit('default-value-popup-editor', new Model({ elements: [] }));
    emit('table-values-popup-editor', new Model({ elements: [] }));

    expect(bindSurvey).toHaveBeenCalledTimes(2);
  });

  it('disposes preview bindings on cleanup', () => {
    const disposeDesigner = vi.fn();
    const disposePreview = vi.fn();
    const bindSurvey = vi
      .fn()
      .mockReturnValueOnce(disposeDesigner)
      .mockReturnValueOnce(disposePreview);
    const { creator, emit } = createMockCreator(new Model({ elements: [] }));

    const cleanup = bindSurveyToCreatorAreas(creator, `${BOUND_KEY}-cleanup`, bindSurvey);
    emit('preview-tab', new Model({ elements: [] }));

    cleanup();

    expect(disposeDesigner).toHaveBeenCalledTimes(1);
    expect(disposePreview).toHaveBeenCalledTimes(1);
    expect(creator.onSurveyInstanceCreated.remove).toHaveBeenCalledTimes(1);
  });
});
