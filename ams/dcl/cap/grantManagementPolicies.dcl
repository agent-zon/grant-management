// Delivered base policies: CAP grant-management roles composed with subject (see BTP DCL — USE / RESTRICT).
// Assign cap.grant_management_by_subject (or cap.authenticated_user_grant_management) to humans in IAS; binds AMS attribute `subject` to the signed-in user's id ($user.user_uuid).

@description: 'Parameterizes all grant_management_* CAP roles on subject; use via USE + RESTRICT (admin / composed policies).'
POLICY my_grants {
  ASSIGN ROLE grant_management_create WHERE subject IS NOT RESTRICTED;
  ASSIGN ROLE grant_management_update WHERE subject IS NOT RESTRICTED;
  ASSIGN ROLE grant_management_replace WHERE subject IS NOT RESTRICTED;
  ASSIGN ROLE grant_management_revoke WHERE subject IS NOT RESTRICTED;
  ASSIGN ROLE grant_management_query WHERE subject IS NOT RESTRICTED;
}

@label: 'Grant management for signed-in user (own subject)'
@description: 'Default bundle: same as my_grants with subject fixed to IAS user id (SCIM / sub → $user.user_uuid).'
POLICY grant_management_by_subject {
  USE my_grants RESTRICT subject = $user.user_uuid;
}

@label: 'Grant management for signed-in user (alias)'
@description: 'Equivalent to grant_management_by_subject; name reflects authenticated end-user default.'
POLICY authenticated_user_grant_management {
  USE my_grants RESTRICT subject = $user.user_uuid;
}
