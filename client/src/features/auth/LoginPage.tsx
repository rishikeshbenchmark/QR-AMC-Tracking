import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  Center,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { getApiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';

// Mirrors the server's loginSchema so client and server validation cannot drift.
const loginFormSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface FromState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const redirectTo = (location.state as FromState | null)?.from?.pathname ?? '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  // If already authenticated (e.g. navigated here manually), don't show the form.
  useEffect(() => {
    setFormError(null);
  }, []);

  if (status === 'authenticated') {
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Could not sign in. Please try again.'));
    }
  });

  return (
    <Center h="100vh" p="md">
      <Card withBorder shadow="sm" radius="md" p="xl" w={380} maw="100%">
        <form onSubmit={onSubmit} noValidate>
          <Stack>
            <Title order={2} ta="center">
              QR-AMC Sign in
            </Title>

            {formError && (
              <Alert color="red" role="alert" variant="light">
                {formError}
              </Alert>
            )}

            <TextInput
              label="Email"
              type="email"
              autoComplete="username"
              autoFocus
              error={errors.email?.message}
              {...register('email')}
            />
            <PasswordInput
              label="Password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" loading={isSubmitting} fullWidth mt="sm">
              Sign in
            </Button>
          </Stack>
        </form>
      </Card>
    </Center>
  );
}
