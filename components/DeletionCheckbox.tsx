import React, { FunctionComponent } from "react";
import { Checkbox, CheckboxProps } from "@mui/material";
import { IndeterminateCheckBox } from "@mui/icons-material";

export const DeletionCheckbox: FunctionComponent<CheckboxProps> =
  React.forwardRef((props, ref) => (
    <Checkbox
      {...props}
      ref={ref}
      color="error"
      checkedIcon={<IndeterminateCheckBox />}
    />
  ));
