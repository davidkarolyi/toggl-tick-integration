import { DateRangePicker, LoadingButton, LocalizationProvider } from "@mui/lab";
import AdapterDateFns from "@mui/lab/AdapterDateFns";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { RefreshRounded, AssignmentTurnedInRounded } from "@mui/icons-material";
import { observer } from "mobx-react-lite";
import React, { FunctionComponent } from "react";
import { useStore } from "../lib/store";

export const IntegrationForm: FunctionComponent = observer(() => {
  const store = useStore();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Stack spacing={2}>
        <InputLabel>Date Range:</InputLabel>
        <DateRangePicker
          startText="From"
          endText="To"
          value={store.integration.dateRange}
          disabled={
            store.source.timeEntries.isPending ||
            store.target.timeEntries.isPending
          }
          onChange={(newRange) => {
            if (newRange[0] && newRange[1])
              store.integration.setDateRange([newRange[0], newRange[1]]);
          }}
          renderInput={(startProps, endProps) => {
            return (
              <Stack direction="row" spacing={2}>
                <TextField {...startProps} />
                <TextField {...endProps} />
              </Stack>
            );
          }}
        />
        <InputLabel>Target:</InputLabel>
        <FormControl fullWidth>
          <InputLabel id="project-select-label">Project</InputLabel>
          <Select
            labelId="project-select-label"
            id="project-select"
            value={store.target.selectedProject}
            label="Project"
            onChange={(event) =>
              store.target.setSelectedProject(event.target.value)
            }
            disabled={
              !store.target.isAuthenticated || !store.target.projects.value
            }
          >
            {store.target.projects.value?.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel id="task-select-label">Task</InputLabel>
          <Select
            labelId="task-select-label"
            id="task-select"
            value={store.target.selectedTask}
            label="Task"
            onChange={(event) =>
              store.target.setSelectedTask(event.target.value)
            }
            disabled={
              !store.target.selectedProject || !store.target.tasks.value
            }
          >
            {store.target.tasks.value?.map((task) => (
              <MenuItem key={task.id} value={task.id}>
                {task.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <LoadingButton
          onClick={() => store.integration.refresh()}
          variant="text"
          startIcon={<RefreshRounded />}
          disabled={
            !store.source.isAuthenticated ||
            !store.target.isAuthenticated ||
            !store.target.selectedTask ||
            store.integration.submissionResult.isPending
          }
          loading={store.integration.refreshState.isPending}
        >
          Refresh
        </LoadingButton>
        <LoadingButton
          onClick={() => store.integration.submit()}
          disabled={
            !store.integration.isSubmitable ||
            store.integration.refreshState.isPending
          }
          variant="contained"
          size="large"
          loading={store.integration.submissionResult.isPending}
          startIcon={<AssignmentTurnedInRounded />}
        >
          Submit Selection
        </LoadingButton>
      </Stack>
    </LocalizationProvider>
  );
});
