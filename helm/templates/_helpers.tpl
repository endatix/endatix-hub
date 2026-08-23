{{/*
Release-qualified resource name, shared by every resource in this chart so two
releases can coexist in one namespace without colliding. Truncated to 63 chars
for the DNS label limit; if the release name already contains the chart name
(e.g. `helm install endatix-hub ./helm`) it is not repeated.
*/}}
{{- define "endatix-hub.fullname" -}}
{{- if contains .Chart.Name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/*
Selector labels. These must be release-specific: without the instance label the
Service of one release would also match the pods of another. Used verbatim in
the Deployment selector, the pod template, and the Service selector — a
Deployment's selector is immutable, so all three must stay in sync.
*/}}
{{- define "endatix-hub.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
API origin env. Emits exactly one of ENDATIX_API_URL or ENDATIX_BASE_URL.
Overlays keep chart defaults, so both can be non-empty unless apiUrl is cleared.
apiPrefix is only emitted in baseUrl mode.
*/}}
{{- define "endatix-hub.apiEnvVars" -}}
{{- $apiUrl := .Values.api.apiUrl | default "" | toString | trim -}}
{{- $baseUrl := .Values.api.baseUrl | default "" | toString | trim -}}
{{- if and $apiUrl $baseUrl -}}
{{- fail "Set exactly one of api.apiUrl or api.baseUrl (not both). Set api.apiUrl to \"\" when using api.baseUrl." -}}
{{- end -}}
{{- if and (not $apiUrl) (not $baseUrl) -}}
{{- fail "Set api.apiUrl or api.baseUrl." -}}
{{- end -}}
{{- if $apiUrl }}
- name: ENDATIX_API_URL
  value: {{ $apiUrl | quote }}
{{- end }}
{{- if $baseUrl }}
- name: ENDATIX_BASE_URL
  value: {{ $baseUrl | quote }}
- name: ENDATIX_API_PREFIX
  value: {{ .Values.api.apiPrefix | quote }}
{{- end }}
{{- end -}}
