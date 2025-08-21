import {
  EventBase,
  ILocalizableOwner,
  Question,
  SurveyError,
} from "survey-core";

const EMPTY_VALUE = "";

export class QuestionFileModelBase extends Question {
  get isUploading(): boolean {
    return this.getPropertyValue("isUploading");
  }
  set isUploading(val: boolean) {
    this.setPropertyValue("isUploading", val);
  }

  get currentState(): string {
    return this.getPropertyValue("currentState");
  }
  set currentState(val: string) {
    this.setPropertyValue("currentState", val);
  }

  /**
   * An event that is raised after the upload state has changed.
   *
   * Parameters:
   *
   * - `sender`: `SurveyModel`\
   * A survey instance that raised the event.
   * - `options.state`: `string`\
   * The current upload state: `"empty"`, `"loading"`, `"loaded"`, or `"error"`.
   */
  public onUploadStateChanged: EventBase<QuestionFileModelBase> =
    this.addEvent<QuestionFileModelBase>();
  public onStateChanged: EventBase<QuestionFileModelBase> =
    this.addEvent<QuestionFileModelBase>();
  protected stateChanged(state: string) {
    if (this.currentState == state) {
      return;
    }
    if (state === "loading") {
      this.isUploading = true;
    }
    if (state === "loaded") {
      this.isUploading = false;
    }
    if (state === "error") {
      this.isUploading = false;
    }
    this.currentState = state;
    this.onStateChanged.fire(this, { state: state });
    this.onUploadStateChanged.fire(this, { state: state });
  }
  public get showLoadingIndicator(): boolean {
    return this.isUploading;
  }
  /**
   * Specifies whether to store file or signature content as text in `SurveyModel`'s [`data`](https://surveyjs.io/form-library/documentation/surveymodel#data) property.
   *
   * If you disable this property, implement `SurveyModel`'s [`onUploadFiles`](https://surveyjs.io/form-library/documentation/surveymodel#onUploadFiles) event handler to specify how to store file content.
   *
   * [File Upload Demo](https://surveyjs.io/form-library/examples/file-upload/ (linkStyle))
   *
   * [Signature Pad Demo](https://surveyjs.io/form-library/examples/upload-signature-pad-data-to-server/ (linkStyle))
   */
  public get storeDataAsText(): boolean {
    return this.getPropertyValue("storeDataAsText");
  }
  public set storeDataAsText(val: boolean) {
    this.setPropertyValue("storeDataAsText", val);
  }
  /**
   * Enable this property if you want to wait until files are uploaded to complete the survey.
   *
   * Default value: `false`
   *
   * [File Upload Demo](https://surveyjs.io/form-library/examples/file-upload/ (linkStyle))
   *
   * [Signature Pad Demo](https://surveyjs.io/form-library/examples/upload-signature-pad-data-to-server/ (linkStyle))
   */
  public get waitForUpload(): boolean {
    return this.getPropertyValue("waitForUpload");
  }
  public set waitForUpload(val: boolean) {
    this.setPropertyValue("waitForUpload", val);
  }

  public clearValue(keepComment?: boolean): void {
    this.clearOnDeletingContainer();
    super.clearValue(keepComment);
  }
  public clearOnDeletingContainer() {
    if (!this.survey) return;
    this.survey.clearFiles(this, this.name, this.value, EMPTY_VALUE, () => {});
  }
  protected onCheckForErrors(
    errors: Array<SurveyError>,
    isOnValueChanged: boolean,
    fireCallback: boolean,
  ): void {
    super.onCheckForErrors(errors, isOnValueChanged, fireCallback);
    if (this.isUploading && this.waitForUpload) {
      errors.push(
        new UploadingFileError(
          this.getLocalizationString("uploadingFile"),
          this,
        ),
      );
    }
  }
  protected uploadFiles(files: File[]) {
    if (this.survey) {
      this.stateChanged("loading");
      this.survey.uploadFiles(
        this,
        this.name,
        files,
        (arg1: any, arg2: any) => {
          if (Array.isArray(arg1)) {
            this.setValueFromResult(arg1);
            if (Array.isArray(arg2)) {
              arg2.forEach((error) =>
                this.errors.push(new UploadingFileError(error, this)),
              );
              this.stateChanged("error");
            }
          }
          if (arg1 === "success" && Array.isArray(arg2)) {
            this.setValueFromResult(arg2);
          }
          if (arg1 === "error") {
            if (typeof arg2 === "string") {
              this.errors.push(new UploadingFileError(arg2, this));
            }
            if (Array.isArray(arg2) && arg2.length > 0) {
              arg2.forEach((error) =>
                this.errors.push(new UploadingFileError(error, this)),
              );
            }
            this.stateChanged("error");
          }
          this.stateChanged("loaded");
        },
      );
    }
  }
  protected loadPreview(newValue: any): void {}
  protected onChangeQuestionValue(newValue: any): void {
    super.onChangeQuestionValue(newValue);
    this.stateChanged(this.isEmpty() ? "empty" : "loaded");
  }

  protected getIsQuestionReady(): boolean {
    return super.getIsQuestionReady() && !this.isFileLoading;
  }
  private isFileLoadingValue: boolean = false;
  protected get isFileLoading(): boolean {
    return this.isFileLoadingValue;
  }
  protected set isFileLoading(val: boolean) {
    this.isFileLoadingValue = val;
    this.updateIsReady();
  }
}

export class UploadingFileError extends SurveyError {
  constructor(public text: string, errorOwner?: ISurveyErrorOwner) {
    super(text, errorOwner);
  }
  public getErrorType(): string {
    return "uploadingfile";
  }
  protected getDefaultText(): string {
    return this.getLocalizationString("uploadingFile");
  }
}

export interface ISurveyErrorOwner extends ILocalizableOwner {
  getErrorCustomText(text: string, error: SurveyError): string;
}
