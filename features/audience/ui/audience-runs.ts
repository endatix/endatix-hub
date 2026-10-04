"use client";

import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";
import type { AudienceDataType } from "@/lib/endatix-api/audience/types";
import { createAudiencePropertyAction } from "../create-property";
import { deleteAudiencePropertyAction } from "../delete-property";
import { updateAudiencePropertyAction } from "../update-property";
import { createAudiencePersonAction } from "../create-person";
import { deleteAudiencePersonAction } from "../delete-person";
import { updateAudiencePersonAction } from "../update-person";
import { updateAudienceSettingsAction } from "../update-settings";
import type {
  AudienceIdentifierKind,
  AudiencePerson,
  AudiencePropertyValues,
} from "@/lib/endatix-api/audience/types";

async function runAction(
  result: Result<unknown>,
  successMessage: string,
): Promise<boolean> {
  if (Result.isError(result)) {
    toast.error(result.message);
    return false;
  }
  toast.success(successMessage);
  return true;
}

export async function runCreateProperty(
  formId: string,
  name: string,
  dataType: AudienceDataType,
): Promise<boolean> {
  return runAction(
    await createAudiencePropertyAction({ formId, name, dataType }),
    "Property created",
  );
}

export async function runRenameProperty(
  formId: string,
  propertyId: string,
  name: string,
): Promise<boolean> {
  return runAction(
    await updateAudiencePropertyAction({ formId, propertyId, name }),
    "Property renamed",
  );
}

export async function runDeleteProperty(
  formId: string,
  propertyId: string,
): Promise<boolean> {
  return runAction(
    await deleteAudiencePropertyAction(formId, propertyId),
    "Property deleted",
  );
}

export async function runCreatePerson(
  formId: string,
  identifier: string,
  values: AudiencePropertyValues,
): Promise<boolean> {
  return runAction(
    await createAudiencePersonAction({ formId, identifier, values }),
    "Person added",
  );
}

export async function runUpdatePersonValues(args: {
  formId: string;
  person: AudiencePerson;
  propertyId: string;
  nextValue: string;
}): Promise<boolean> {
  const { formId, person, propertyId, nextValue } = args;
  if ((person.values[propertyId] ?? "") === nextValue) return false;

  return runAction(
    await updateAudiencePersonAction({
      formId,
      membershipId: person.membershipId,
      values: { [propertyId]: nextValue },
    }),
    "Person updated",
  );
}

export async function runDeletePerson(
  formId: string,
  membershipId: string,
): Promise<boolean> {
  return runAction(
    await deleteAudiencePersonAction(formId, membershipId),
    "Person removed from this form",
  );
}

export async function runUpdateMatchKey(
  identifierKind: AudienceIdentifierKind,
): Promise<boolean> {
  return runAction(
    await updateAudienceSettingsAction(identifierKind),
    "Match key updated",
  );
}
