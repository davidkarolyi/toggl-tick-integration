import { Snackbar, Alert as MUIAlert } from "@mui/material";
import { observer } from "mobx-react-lite";
import React, { FunctionComponent } from "react";
import { useStore } from "../lib/store";

export const Alert: FunctionComponent = observer(() => {
  const store = useStore();

  const closeAlert = () => store.setAlert(null);

  return (
    <Snackbar
      open={store.alert !== null}
      autoHideDuration={4000}
      onClose={closeAlert}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <MUIAlert
        elevation={6}
        variant="filled"
        onClose={closeAlert}
        severity={store.alert?.type}
        sx={{ width: "100%" }}
      >
        {store.alert?.message}
      </MUIAlert>
    </Snackbar>
  );
});
