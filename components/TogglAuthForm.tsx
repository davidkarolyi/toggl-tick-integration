import { LoadingButton } from "@mui/lab";
import { Button, Stack, TextField } from "@mui/material";
import { observer } from "mobx-react-lite";
import React, { FunctionComponent, useState } from "react";
import { useStore } from "../lib/store";

export const TogglAuthForm: FunctionComponent = observer(() => {
  const store = useStore();
  const [token, setToken] = useState("");

  return (
    <Stack spacing={2}>
      <TextField
        id="token"
        label="API Token"
        type="password"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        disabled={store.source.isLoading}
      />
      <LoadingButton
        variant="contained"
        size="large"
        onClick={() => store.authSource({ token })}
        loading={store.source.isLoading}
      >
        Authenticate
      </LoadingButton>
    </Stack>
  );
});
