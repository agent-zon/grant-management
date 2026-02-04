{{- define "agent-indentity-proxy.name" -}}
{{- default .Chart.Name .Values.proxy.fullnameOverride -}}
{{- end -}}

{{- define "agent-indentity-proxy.fullname" -}}
{{- $name := (include "agent-indentity-proxy.name" .) -}}
{{- printf "%s" $name -}}
{{- end -}}

{{- define "agent-indentity-proxy.labels" -}}
app.kubernetes.io/name: {{ include "agent-indentity-proxy.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
{{- end -}}
