import { DynamicPanelItemValueChangedEvent, QuestionPanelDynamicModel, SurveyModel } from "survey-core";

interface LoopingPanelModel extends QuestionPanelDynamicModel {
    loopSource?: string[];
    exitLoopCondition?: string;
    exitAllLoopsCondition?: string;
}

function resolveCondition(condition: string, panelName: string, currentIndex: number) {
    if (!condition) return "";

    // Regex looks for "{panel." (case insensitive)
    // and replaces it with "{PanelName[Index]."
    const absolutePath = `{${panelName}[${currentIndex}].`;
    return condition.replace(/\{panel\./gi, absolutePath);
}

export function handleLoopExits(survey: SurveyModel) {
    const handler = (sender: SurveyModel, options: DynamicPanelItemValueChangedEvent) => {
        const loopPanel = options.question as LoopingPanelModel;
        const { 
            loopSource,
            exitLoopCondition : singleCondition, 
            exitAllLoopsCondition : allCondition
             } = loopPanel;

        if (!loopSource || loopSource.length === 0)  return;
        if (!allCondition && !singleCondition) return;

        // Evaluate "Exit All Loops"
        let shouldExitAllLoops = false;
        if (typeof allCondition === "string" && allCondition.trim() !== "") {
            const expr = resolveCondition(allCondition, loopPanel.name, options.panelIndex);
            shouldExitAllLoops = sender.runCondition(expr);
        }

        // Evaluate "Exit Current Loop"
        let shouldExitCurrentLoop = false;
        if (typeof singleCondition === "string" && singleCondition.trim() !== "") {
            const expr = resolveCondition(singleCondition, loopPanel.name, options.panelIndex);
            shouldExitCurrentLoop = sender.runCondition(expr);
        }

        let shouldUpdateNavigation = false;

        // Hide Future Panels (Exit all)
        if (options.panelIndex < loopPanel.panels.length) {
            for (let i = options.panelIndex + 1; i < loopPanel.panels.length; i++) {
                // Toggle visibility for all SUBSEQUENT panels
                // If shouldExitAllLoops is true -> hide them. 
                // If shouldExitAllLoops is false -> show them (in case user changed their mind).
                if (loopPanel.panels[i].visible === shouldExitAllLoops) {
                    shouldUpdateNavigation = true;
                    loopPanel.panels[i].visible = !shouldExitAllLoops;
                }
            }
        }

        // Hide Remaining Questions in Current Panel (Exit current)
        const shouldHideRestOfPanel = shouldExitAllLoops || shouldExitCurrentLoop;
        
        const currentPanelQuestions = options.panel.questions;
        let triggerIndex = -1;

        // Find the question that triggered this event
        for (let i = 0; i < currentPanelQuestions.length; i++) {
            if (currentPanelQuestions[i].name === options.name) {
                triggerIndex = i;
                break;
            }
        }

        if (triggerIndex !== -1) {
            // Toggle visibility for all SUBSEQUENT questions
            // If shouldExitCurrentLoop is true -> hide them. 
            // If shouldExitCurrentLoop is false -> show them (in case user changed their mind).
            for (let i = triggerIndex + 1; i < currentPanelQuestions.length; i++) {
                if (currentPanelQuestions[i].visible === shouldHideRestOfPanel) {
                    shouldUpdateNavigation = true;
                    currentPanelQuestions[i].visible = !shouldHideRestOfPanel;
                }
            }
        }

        if(shouldUpdateNavigation ) {
            sender.updateNavigationElements();
        }
    };

    survey.onDynamicPanelValueChanged.add(handler);

    return () => {
        survey.onDynamicPanelValueChanged.remove(handler);
    };
}