# tryPan Supabase email templates

Paste `confirm-signup.html` into Supabase:

Authentication → Email Templates → Confirm signup → Source

Suggested subject:

Confirm your tryPan account

The template uses Supabase's `{{ .ConfirmationURL }}` variable for the verification link.
