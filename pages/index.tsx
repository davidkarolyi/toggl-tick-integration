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
    store.loadStoredCredentials();
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
              store.source.value
                ? {
                    content: "Forget Credentials",
                    onClick: () => store.forgetSourceCredentials(),
                  }
                : undefined
            }
          >
            {store.source.value ? (
              <TimeEntryList
                state={store.sourceTimeEntries}
                selection={store.sourceTimeEntriesSelection}
                onSelectionChange={(selection) =>
                  store.setSourceTimeEntriesSelection(selection)
                }
                alreadySynced={store.alreadySyncedSourceEntries}
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
              store.target.value
                ? {
                    content: "Forget Credentials",
                    onClick: () => store.forgetTargetCredentials(),
                  }
                : undefined
            }
          >
            {store.target.value ? (
              <>
                {Boolean(store.targetTimeEntries.value?.length) && (
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
                    value={store.allowDeletionFromTarget}
                    onChange={() => store.toggleAllowDeletionFromTarget()}
                  />
                )}

                {store.allowDeletionFromTarget ? (
                  <TimeEntryList
                    key="with-checkbox"
                    state={store.targetTimeEntries}
                    selection={store.targetTimeEntriesSelection}
                    onSelectionChange={(selection) =>
                      store.setTargetTimeEntriesSelection(selection)
                    }
                    customCheckbox={DeletionCheckbox}
                  />
                ) : (
                  <TimeEntryList
                    key="without-checkbox"
                    state={store.targetTimeEntries}
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
