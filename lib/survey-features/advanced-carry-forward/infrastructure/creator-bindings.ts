import type { SurveyCreatorModel } from 'survey-creator-core';
import { bindSurveyToCreatorAreas } from '@/lib/survey-features/infrastructure/creator-survey-bindings';
import { bindAdvancedCarryForwardToSurvey } from './survey-bindings';

const ADVANCED_CARRY_FORWARD_CREATOR_BOUND_KEY =
  '__endatixAdvancedCarryForwardCreatorBound';

export function bindAdvancedCarryForwardToCreator(
  creator: SurveyCreatorModel,
): () => void {
  return bindSurveyToCreatorAreas(
    creator,
    ADVANCED_CARRY_FORWARD_CREATOR_BOUND_KEY,
    bindAdvancedCarryForwardToSurvey,
  );
}
