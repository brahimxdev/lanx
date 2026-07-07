-- Custom SQL migration file, put your code below! --

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
CREATE TRIGGER set_auth_users_updated_at
BEFORE UPDATE ON auth_users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

-- auto-revoke all sessions the moment a user is soft-deleted.
CREATE OR REPLACE FUNCTION revoke_sessions_on_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE sessions
    SET revoked_at = now()
    WHERE auth_user_id = NEW.id AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for soft delete auth revoke session
CREATE TRIGGER on_auth_user_soft_delete
AFTER UPDATE ON auth_users
FOR EACH ROW
EXECUTE FUNCTION revoke_sessions_on_soft_delete();
