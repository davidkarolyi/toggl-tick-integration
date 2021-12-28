import type { NextPage } from "next";
import { Grid } from "@mui/material";
import { PlatformContainer } from "../components/PlatformContainer";
import { TickAuthForm } from "../components/TickAuthForm";
import { TogglAuthForm } from "../components/TogglAuthForm";
import { observer } from "mobx-react-lite";
import { useStore } from "../lib/store";
import { Alert } from "../components/Alert";
import { IntegrationForm } from "../components/IntegrationForm";
import { TimeEntryList } from "../components/TimeEntryList";

const Home: NextPage = observer(() => {
  const store = useStore();

  return (
    <>
      <Alert />
      <Grid container spacing={2} padding={6}>
        <Grid item xs>
          <PlatformContainer name="Toggl" iconUrl="/toggl_logo.png">
            {store.toggl.value ? (
              <TimeEntryList
                state={store.togglTimeEntries}
                selection={store.togglTimeEntriesSelection}
                onSelectionChange={(selection) =>
                  store.setTogglTimeEntriesSelection(selection)
                }
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
          <PlatformContainer name="Tick" iconUrl="/tick_logo.png">
            {store.tick.value ? (
              <TimeEntryList state={store.tickTimeEntries} />
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
