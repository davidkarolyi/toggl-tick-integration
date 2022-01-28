import { Stack, TextField } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import React, { FunctionComponent, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../lib/store";

export const TickAuthForm: FunctionComponent = observer(() => {
  const store = useStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = () => store.target.auth({ email, password });
  const { isLoading } = store.target.authenticatedAdapter;

  return (
    <Stack spacing={2}>
      <TextField
        id="email"
        label="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={isLoading}
      />
      <TextField
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={isLoading}
      />
      <LoadingButton
        onClick={onSubmit}
        variant="contained"
        size="large"
        loading={isLoading}
      >
        Authenticate
      </LoadingButton>
    </Stack>
  );
});
