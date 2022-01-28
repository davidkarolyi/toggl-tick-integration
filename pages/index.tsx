import type { NextPage } from "next";
import {
  Checkbox,
  FormControlLabel,
  Grid,
  Tooltip,
  Typography,
} from "@mui/material";
import { PlatformContainer } from "../components/PlatformContainer";
import { TickAuthForm } from "../components/TickAuthForm";
import { TogglAuthForm } from "../components/TogglAuthForm";
import { observer } from "mobx-react-lite";
import { useStore } from "../lib/store";
import { Alert } from "../components/Alert";
import { IntegrationForm } from "../components/IntegrationForm";
import { TimeEntryList } from "../components/TimeEntryList";
import { useEffect } from "react";
import { DeletionCheckbox } from "../components/DeletionCheckbox";

const Home: NextPage = observer(() => {
  const store = useStore();

  useEffect(() => {
    store.source.loadStoredCredentials();
    store.target.loadStoredCredentials();
  }, []);

  return (
    <>
      <Alert />
      <Grid container spacing={2} padding={6}>
        <Grid item xs>
          <PlatformContainer
            name="Toggl"
            iconUrl="/toggl_logo.png"
            rightButton={
              store.source.isAuthenticated
                ? {
                    content: "Forget Credentials",
                    onClick: () => store.source.forgetCredentials(),
                  }
                : undefined
            }
          >
            {store.source.isAuthenticated ? (
              <TimeEntryList
                state={store.source.timeEntries}
                selection={store.source.timeEntriesSelection}
                onSelectionChange={(selection) =>
                  store.source.setTimeEntriesSelection(selection)
                }
                label={{
                  text: "already synced",
                  entries: store.integration.alreadySyncedSourceEntries,
                }}
              />
            ) : (
              <TogglAuthForm />
            )}
          </PlatformContainer>
        </Grid>
        <Grid item xs>
          <PlatformContainer name="Integration">
            <IntegrationForm />
          </PlatformContainer>
        </Grid>
        <Grid item xs>
          <PlatformContainer
            name="Tick"
            iconUrl="/tick_logo.png"
            rightButton={
              store.target.isAuthenticated
                ? {
                    content: "Forget Credentials",
                    onClick: () => store.target.forgetCredentials(),
                  }
                : undefined
            }
          >
            {store.target.isAuthenticated ? (
              <>
                {Boolean(store.target.timeEntries.value?.length) && (
                  <FormControlLabel
                    control={<Checkbox size="small" />}
                    label={
                      <Tooltip
                        arrow
                        title="You will be able select entries, which will be deleted from Tick."
                      >
                        <Typography fontSize=".85rem">
                          Allow deleting entries from Tick
                        </Typography>
                      </Tooltip>
                    }
                    value={store.target.isDeletionAllowed}
                    onChange={() => store.target.toggleIsDeletionAllowed()}
                  />
                )}

                {store.target.isDeletionAllowed ? (
                  <TimeEntryList
                    key="with-checkbox"
                    state={store.target.timeEntries}
                    selection={store.target.timeEntriesSelection}
                    onSelectionChange={(selection) =>
                      store.target.setTimeEntriesSelection(selection)
                    }
                    customCheckbox={DeletionCheckbox}
                    label={{
                      text: "not exists in Toggl",
                      entries:
                        store.integration.targetEntriesNotExistingInSource,
                    }}
                  />
                ) : (
                  <TimeEntryList
                    key="without-checkbox"
                    state={store.target.timeEntries}
                  />
                )}
              </>
            ) : (
              <TickAuthForm />
            )}
          </PlatformContainer>
        </Grid>
      </Grid>
    </>
  );
});

export default Home;
