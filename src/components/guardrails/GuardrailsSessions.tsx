import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveDataContext } from '../../state/useActiveDataContext';

export function GuardrailsSessions() {
  const { activeProjectId } = useActiveDataContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (activeProjectId) {
      navigate('/guardrails/focus');
    } else {
      navigate('/guardrails/dashboard?needProject=1');
    }
  }, [activeProjectId, navigate]);

  return null;
}
