import { Alert, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import {
  DataGrid,
  DataGridProps,
  GridSelectionModel,
  GridSortModel,
} from "@mui/x-data-grid";
import { observer } from "mobx-react-lite";
import React, { FunctionComponent, useState } from "react";
import { TimeEntry } from "../lib/adapters/types";
import { AsyncState, useStore } from "../lib/store";
import { format } from "date-fns";

export const TimeEntryList: FunctionComponent<{
  state: AsyncState<Array<TimeEntry>>;
  selection?: Array<string>;
  onSelectionChange?: (selection: Array<string>) => void;
  alreadySynced?: Array<string>;
}> = observer((props) => {
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: "date", sort: "asc" },
  ]);

  if (props.state.isLoading) {
    return (
      <>
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </>
    );
  }

  if (props.state.error) {
    return <Alert severity="error">{props.state.error.message}</Alert>;
  }

  const columns: DataGridProps["columns"] = [
    { field: "date", headerName: "Date", editable: false, width: 100 },
    {
      field: "description",
      headerName: "Description",
      editable: false,
      width: 250,
      renderCell: (params) => {
        return (
          <Stack maxWidth="100%">
            <Tooltip title={params.value} disableInteractive arrow>
              <Typography component="span" fontSize="inherit" noWrap>
                {params.value}
              </Typography>
            </Tooltip>

            {props.alreadySynced?.includes(params.id.toString()) && (
              <Typography
                fontWeight="light"
                color="gray"
                component="span"
                fontSize="inherit"
              >
                (already synced)
              </Typography>
            )}
          </Stack>
        );
      },
    },
    { field: "duration", headerName: "Duration", editable: false, width: 100 },
  ];
  const rows: DataGridProps["rows"] =
    props.state.value?.map((entry) => ({
      id: entry.id,
      date: format(entry.date, "yyyy.MM.dd"),
      description: entry.description,
      duration: `${(entry.durationInSeconds / 60 / 60).toFixed(2)}h`,
    })) || [];

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      pageSize={20}
      rowsPerPageOptions={[20]}
      autoHeight
      checkboxSelection={Boolean(props.selection)}
      selectionModel={props.selection}
      onSelectionModelChange={
        props.onSelectionChange as
          | ((model: GridSelectionModel) => void)
          | undefined
      }
      sortModel={sortModel}
      onSortModelChange={setSortModel}
      disableColumnMenu
    />
  );
});
