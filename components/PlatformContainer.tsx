import { Card, Container, Stack, Typography } from "@mui/material";
import Image from "next/image";
import React, { FunctionComponent } from "react";

export type PlatformContainerProps = {
  name: string;
  iconUrl?: string;
};

export const PlatformContainer: FunctionComponent<PlatformContainerProps> = (
  props
) => {
  return (
    <Card variant="outlined">
      <Stack spacing={2} padding={3}>
        <Stack
          alignItems="center"
          spacing={1}
          justifyContent="center"
          direction="row"
        >
          {props.iconUrl && (
            <Image src={props.iconUrl} height={40} width={40} />
          )}
          <Typography variant="h4" textAlign="center" component="div">
            {props.name}
          </Typography>
        </Stack>
        <Container>{props.children}</Container>
      </Stack>
    </Card>
  );
};
