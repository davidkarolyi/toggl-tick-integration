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
          value={store.dateRange}
          disabled={
            store.sourceTimeEntries.isLoading ||
            store.targetTimeEntries.isLoading
          }
          onChange={(newRange) => {
            if (newRange[0] && newRange[1])
              store.setDateRange([newRange[0], newRange[1]]);
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
            value={store.selectedTargetProject}
            label="Project"
            onChange={(event) => store.setTargetProject(event.target.value)}
            disabled={!store.target.value || !store.targetProjects.value}
          >
            {store.targetProjects.value?.map((project) => (
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
            value={store.selectedTargetTask}
            label="Task"
            onChange={(event) => store.setTargetTask(event.target.value)}
            disabled={!store.selectedTargetProject || !store.targetTasks.value}
          >
            {store.targetTasks.value?.map((task) => (
              <MenuItem key={task.id} value={task.id}>
                {task.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <LoadingButton
          onClick={() => store.refresh()}
          variant="text"
          startIcon={<RefreshRounded />}
          disabled={
            !store.isAuthenticated ||
            !store.selectedTargetTask ||
            store.submissionResult.isLoading
          }
          loading={store.refreshState.isLoading}
        >
          Refresh
        </LoadingButton>
        <LoadingButton
          onClick={() => store.submitSelectedEntries()}
          disabled={!store.isSubmitable || store.refreshState.isLoading}
          variant="contained"
          size="large"
          loading={store.submissionResult.isLoading}
          startIcon={<AssignmentTurnedInRounded />}
        >
          Submit Selection
        </LoadingButton>
      </Stack>
    </LocalizationProvider>
  );
});
