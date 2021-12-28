import { DateRangePicker, LoadingButton, LocalizationProvider } from "@mui/lab";
import AdapterDateFns from "@mui/lab/AdapterDateFns";
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { observer } from "mobx-react-lite";
import React, { FunctionComponent, useState } from "react";
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
          onChange={(newRange) => store.setDateRange(newRange)}
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
            value={store.targetProject}
            label="Project"
            onChange={(event) => store.setTargetProject(event.target.value)}
            disabled={!store.tick.value || !store.tickProjects.value}
          >
            {store.tickProjects.value?.map((project) => (
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
            value={store.targetTask}
            label="Task"
            onChange={(event) => store.setTargetTask(event.target.value)}
            disabled={!store.targetProject || !store.tickTasks.value}
          >
            {store.tickTasks.value?.map((task) => (
              <MenuItem key={task.id} value={task.id}>
                {task.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <LoadingButton
          onClick={() => store.submitSelectedEntries()}
          disabled={!(store.isAuthenticated && store.targetTask)}
          variant="contained"
          size="large"
          loading={store.submissionState.isLoading}
        >
          Submit selection
        </LoadingButton>
      </Stack>
    </LocalizationProvider>
  );
});
