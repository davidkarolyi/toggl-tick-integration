import { Button, Card, Container, Stack, Typography } from "@mui/material";
import Image from "next/image";
import React, { FunctionComponent, ReactNode } from "react";

export type PlatformContainerProps = {
  name: string;
  rightButton?: {
    content: ReactNode;
    onClick: () => void;
  };
  iconUrl?: string;
};

export const PlatformContainer: FunctionComponent<PlatformContainerProps> = (
  props
) => {
  return (
    <Card variant="outlined">
      <Stack spacing={2} paddingY={3}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent={props.rightButton ? "space-between" : "center"}
          marginX={3}
        >
          <Stack
            alignItems="center"
            spacing={1}
            justifyContent="center"
            direction="row"
          >
            {props.iconUrl && (
              <Image
                alt={props.name}
                src={props.iconUrl}
                height={40}
                width={40}
              />
            )}
            <Typography variant="h4" textAlign="center" component="div">
              {props.name}
            </Typography>
          </Stack>
          {props.rightButton && (
            <Button
              size="small"
              variant="outlined"
              onClick={props.rightButton.onClick}
            >
              {props.rightButton.content}
            </Button>
          )}
        </Stack>
        <Container>{props.children}</Container>
      </Stack>
    </Card>
  );
};
