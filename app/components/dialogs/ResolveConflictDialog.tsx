/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces UG (haftungsbeschraenkt)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License (version 3) as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import i18n from '-/services/i18n';
import DialogCloseButton from '-/components/dialogs/DialogCloseButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import useTheme from '@mui/styles/useTheme';
import { OpenedEntry } from '-/reducers/app';
import {
  extractContainingDirectoryPath,
  extractFileExtension,
  extractFileName
} from '@tagspaces/tagspaces-common/paths';
import PlatformFacade from '-/services/platform-facade';
import AppConfig from '-/AppConfig';

interface Props {
  open: boolean;
  onClose: () => void;
  file: OpenedEntry;
  saveAs: (newFilePath: string) => Promise<boolean>;
  override: () => Promise<boolean>;
}

function ResolveConflictDialog(props: Props) {
  const { open, onClose } = props;
  const copyFileName = React.useRef<string>(getFileName());
  const [isSaveAs, setSaveAs] = React.useState<boolean>(false);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  function getFileName() {
    const fileName = extractFileName(props.file.path);
    const ext = extractFileExtension(props.file.path);
    return fileName.slice(0, -(ext.length + 1)) + '-copy.' + ext;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      keepMounted
      scroll="paper"
      aria-labelledby="draggable-dialog-title"
    >
      <DialogTitle style={{ cursor: 'move' }} id="draggable-dialog-title">
        {i18n.t('core:resolveConflictTitle')}
        <DialogCloseButton onClose={onClose} />
      </DialogTitle>
      <DialogContent
        style={{
          overflow: AppConfig.isFirefox ? 'auto' : 'overlay',
          minWidth: 400,
        }}
      >
        {isSaveAs ? (
          <TextField
            label={i18n.t('core:newFileName')}
            margin="dense"
            name="name"
            fullWidth={true}
            data-tid="newFileNameTID"
            defaultValue={copyFileName.current}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              copyFileName.current = event.target.value;
            }}
          />
        ) : (
          i18n.t('core:resolveConflictDesc')
        )}
      </DialogContent>
      <DialogActions>
        {isSaveAs ? (
          <>
            <Button
              data-tid="backTID"
              title={i18n.t('core:cancel')}
              onClick={() => {
                setSaveAs(false);
                onClose();
              }}
              color="primary"
            >
              {i18n.t('core:cancel')}
            </Button>
            <Button
              data-tid="saveTID"
              title={i18n.t('core:save')}
              onClick={() => {
                props
                  .saveAs(
                    extractContainingDirectoryPath(props.file.path) +
                      PlatformFacade.getDirSeparator() +
                      copyFileName.current
                  )
                  .then(() => {
                    onClose();
                  });
              }}
              color="primary"
            >
              {i18n.t('core:save')}
            </Button>
          </>
        ) : (
          <>
            <Button
              data-tid="saveas"
              title={i18n.t('core:saveas')}
              onClick={() => {
                setSaveAs(true);
              }}
              color="primary"
            >
              {i18n.t('core:saveas')}
            </Button>
            <Button
              data-tid="overrideTID"
              title={i18n.t('core:override')}
              onClick={() => {
                props.override().then(() => {
                  onClose();
                });
              }}
              color="primary"
            >
              {i18n.t('core:override')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default ResolveConflictDialog;
