/*
 * Copyright (c) 2016-present - TagSpaces UG (Haftungsbeschraenkt). All rights reserved.
 */
import {
  defaultLocationPath,
  defaultLocationName,
  deleteFileFromMenu,
  createPwMinioLocation,
  createPwLocation
} from './location.helpers';
import { searchEngine } from './search.helpers';
import {
  clickOn,
  createTxtFile,
  expectElementExist,
  expectTagsExistBySelector,
  extractTags,
  getGridCellClass,
  getGridFileName,
  getGridFileSelector,
  isElementDisplayed,
  selectAllFiles,
  selectFilesByID,
  selectorFile,
  selectorFolder,
  selectRowFiles,
  setInputKeys,
  setGridOptions,
  waitForNotification
} from './general.helpers';
import {
  cleanFileName,
  extractFileExtension,
  extractTagsAsObjects
} from '@tagspaces/tagspaces-common/paths';
import { sortByCriteria } from '@tagspaces/tagspaces-common/misc';
import {
  dirSeparator,
  tagDelimiter
} from '@tagspaces/tagspaces-common/AppConfig';
import { AddRemoveTagsToSelectedFiles } from './perspective-grid.helpers';
import { getPropertiesFileName } from './file.properties.helpers';
import { startTestingApp, stopSpectronApp, testDataRefresh } from './hook';

/* const subFolderName = '/test-perspective-grid';
const subFolderContentExtractionPath =
  defaultLocationPath + '/content-extraction';
const subFolderThumbnailsPath = defaultLocationPath + '/thumbnails';
const testTestFilename = 'sample';
*/

describe('TST50 - Perspective Grid', () => {
  beforeAll(async () => {
    await startTestingApp('extconfig-with-welcome.js');
  });

  afterAll(async () => {
    await stopSpectronApp();
    await testDataRefresh();
  });
  beforeEach(async () => {
    if (global.isMinio) {
      await createPwMinioLocation('', defaultLocationName, true);
    } else {
      await createPwLocation(defaultLocationPath, defaultLocationName, true);
    }
    await clickOn('[data-tid=location_' + defaultLocationName + ']');
    // If its have opened file
    // await closeFileProperties();
  });

  test('TST5002 - Open file with click [web,minio,electron]', async () => {
    // await searchEngine('txt'); //testTestFilename);
    const fileName = 'sample.txt';

    // const firstFileName = await getGridFileName(0);
    await clickOn(getGridFileSelector(fileName)); // perspectiveGridTable + firstFile);
    // Toggle Properties
    await clickOn('[data-tid=fileContainerToggleProperties]');
    const propsFileName = await getPropertiesFileName();
    expect(fileName).toBe(propsFileName);
    // await checkFilenameForExist(testTestFilename);
  });

  // Scenarios for sorting files in grid perspective
  describe('TST5003 - Testing sort files in the grid perspective [web,minio,electron]', () => {
    let dirEntries;
    beforeAll(async () => {
      const path = require('path');
      const fs = require('fs-extra');
      const testDir = path.join(
        __dirname,
        '..',
        'testdata-tmp',
        'file-structure',
        'supported-filestypes'
      );
      dirEntries = (await fs.readdir(testDir, { withFileTypes: true }))
        .filter(item => !item.isDirectory() && !item.name.startsWith('.'))
        .map(item => {
          const entryPath = testDir + dirSeparator + item.name;
          const stats = fs.statSync(entryPath);
          return {
            name: cleanFileName(item.name),
            isFile: item.isFile(),
            size: stats.size,
            lmdt: stats.mtime.getTime ? stats.mtime.getTime() : stats.mtime,
            extension: extractFileExtension(item.name, dirSeparator),
            tags: extractTagsAsObjects(item.name, tagDelimiter, dirSeparator)
          };
        });
    });

    beforeEach(async () => {
      await clickOn('[data-tid=gridPerspectiveSortMenu]');
    });

    test('TST10xx - Sort by name [web,minio,electron]', async () => {
      // DESC
      await clickOn('[data-tid=gridPerspectiveSortByName]');
      let sorted = sortByCriteria(dirEntries, 'byName', false);
      for (let i = 0; i < sorted.length; i += 1) {
        const fileName = await getGridFileName(i);
        expect(fileName).toBe(sorted[i].name); //'sample_exif.jpg');
      }

      // ASC
      await clickOn('[data-tid=gridPerspectiveSortMenu]');
      await clickOn('[data-tid=gridPerspectiveSortByName]');

      sorted = sortByCriteria(dirEntries, 'byName', true);
      for (let i = 0; i < sorted.length; i += 1) {
        const fileName = await getGridFileName(i);
        expect(fileName).toBe(sorted[i].name); //'sample.avif');
      }
    });

    test('TST10xx - Sort by size [web,minio,electron]', async () => {
      await clickOn('[data-tid=gridPerspectiveSortBySize]');
      // DESC
      let sorted = sortByCriteria(dirEntries, 'byFileSize', true);
      for (let i = 0; i < sorted.length; i += 1) {
        const fileName = await getGridFileName(i);
        expect(fileName).toBe(sorted[i].name); //'sample.csv');
      }

      // ASC
      await clickOn('[data-tid=gridPerspectiveSortMenu]');
      await clickOn('[data-tid=gridPerspectiveSortBySize]');
      sorted = sortByCriteria(dirEntries, 'byFileSize', false);
      for (let i = 0; i < sorted.length; i += 1) {
        const fileName = await getGridFileName(i);
        expect(fileName).toBe(sorted[i].name); //'sample.nef');
      }
    });

    test('TST10xx - Sort by date [web,minio,electron]', async () => {
      await clickOn('[data-tid=gridPerspectiveSortByDate]');

      let sorted = sortByCriteria(dirEntries, 'byDateModified', true);
      for (let i = 0; i < sorted.length; i += 1) {
        const fileName = await getGridFileName(i);
        expect(fileName).toBe(sorted[i].name);
      }

      // ASC
      await clickOn('[data-tid=gridPerspectiveSortMenu]');
      await clickOn('[data-tid=gridPerspectiveSortByDate]');

      sorted = sortByCriteria(dirEntries, 'byDateModified', false);
      for (let i = 0; i < sorted.length; i += 1) {
        const fileName = await getGridFileName(i);
        expect(fileName).toBe(sorted[i].name);
      }
    });

    test('TST10xx - Sort by extension [web,minio,electron]', async () => {
      await clickOn('[data-tid=gridPerspectiveSortByExt]');
      let sorted = sortByCriteria(dirEntries, 'byExtension', true);
      for (let i = 0; i < sorted.length; i += 1) {
        const fileName = await getGridFileName(i);
        expect(fileName).toBe(sorted[i].name);
      }

      await clickOn('[data-tid=gridPerspectiveSortMenu]');
      await clickOn('[data-tid=gridPerspectiveSortByExt]');
      sorted = sortByCriteria(dirEntries, 'byExtension', false);
      for (let i = 0; i < sorted.length; i += 1) {
        const fileName = await getGridFileName(i);
        expect(fileName).toBe(sorted[i].name);
      }
    });

    test('TST10xx - Sort by tags [web,minio,electron]', async () => {
      await clickOn('[data-tid=gridPerspectiveSortByFirstTag]');
      let sorted = sortByCriteria(dirEntries, 'byFirstTag', true);
      for (let i = 0; i < sorted.length; i += 1) {
        const fileName = await getGridFileName(i);
        expect(fileName).toBe(sorted[i].name);
      }
      // ASC
      await clickOn('[data-tid=gridPerspectiveSortMenu]');
      await clickOn('[data-tid=gridPerspectiveSortByFirstTag]');
      sorted = sortByCriteria(dirEntries, 'byFirstTag', false);
      for (let i = 0; i < sorted.length; i += 1) {
        const fileName = await getGridFileName(i);
        expect(fileName).toBe(sorted[i].name);
      }
    });
  });

  test('TST5004 - Select-deselect all files [web,minio,electron]', async () => {
    const classNotSelected = await getGridCellClass(0);
    await selectAllFiles(); // classNotSelected);
    const classSelected = await getGridCellClass(0);

    expect(classNotSelected).not.toBe(classSelected);

    const filesList = await global.client.$$(selectorFile);
    for (let i = 0; i < filesList.length; i++) {
      let file = await filesList[i].$('div');
      file = await file.$('div');
      const style = await file.getAttribute('class');
      expect(style).toBe(classSelected);
    }
  });

  // This scenario includes "Add tags" && "Remove tags" to be fulfilled
  test('TST5005/TST5006 - Add/Remove tags to the selected files [web,minio,electron]', async () => {
    let selectedIds = await selectRowFiles([0, 1, 2]);

    const tags = ['test-tag1', 'test-tag2'];
    await AddRemoveTagsToSelectedFiles(tags);

    for (let i = 0; i < selectedIds.length; i++) {
      await expectElementExist(
        // selectorFile + '[' + (i + 1) + ']//div[@id="gridCellTags"]//button[1]',
        '[data-tid=tagContainer_' + tags[0] + ']',
        true
      );
      // const selectBox = await global.client.$('[data-tid=perspectiveGridFileTable]');
      /* await expectTagsExistBySelector(
        '[data-entry-id="' + selectedIds[i] + '"]',
        tags,
        true
      ); */
    }

    selectedIds = await selectRowFiles([0, 1, 2]);

    // tags = ['test-tag1', 'test-tag2'];
    await AddRemoveTagsToSelectedFiles(tags, false);

    for (let i = 0; i < selectedIds.length; i++) {
      await expectElementExist(
        selectorFile + '[' + (i + 1) + ']//div[@id="gridCellTags"]//button[1]',
        false,
        1500
      );
      await expectTagsExistBySelector(
        '[data-entry-id="' + selectedIds[i] + '"]',
        tags,
        false
      );
    }
  });

  test('TST5007 - Remove all tags from selected files [web,minio,electron]', async () => {
    const selectedIds = await selectRowFiles([0, 1, 2]);
    const tags = ['test-tag1', 'test-tag2', 'test-tag3'];
    await AddRemoveTagsToSelectedFiles(tags, true);

    await selectFilesByID(selectedIds);

    await clickOn('[data-tid=gridPerspectiveAddRemoveTags]');
    await clickOn('[data-tid=cleanTagsMultipleEntries]');

    for (let i = 0; i < tags.length; i++) {
      await expectElementExist(
        '[data-tid=tagMoreButton_' + tags[i] + ']',
        false
      );
    }
    /* for (let i = 0; i < selectedIds.length; i++) {
      const gridElement = await global.client.$(
        '[data-entry-id="' + selectedIds[i] + '"]'
      );
      await isElementDisplayed(gridElement);
      const tags = await extractTags(gridElement);
      expect(tags.length).toBe(0);
    } */
  });

  test('TST5008 - Copy file [web,minio,electron]', async () => {
    const sampleFileName = 'sample.txt';
    // Electron path: ./testdata-tmp/file-structure/supported-filestypes/empty_folder
    /*const copyLocationPath = global.isElectron
      ? defaultLocationPath + '/empty_folder'
      : 'empty_folder';*/
    // const fileName = await getFirstFileName();

    // select file
    await clickOn(getGridFileSelector(sampleFileName));
    // open Copy File Dialog
    await clickOn('[data-tid=gridPerspectiveCopySelectedFiles]');
    //await setInputKeys('targetPathInput', copyLocationPath);
    await clickOn('[data-tid=MoveTargetempty_folder]');
    await clickOn('[data-tid=confirmCopyFiles]');
    //await waitForNotification();

    await global.client.dblclick(selectorFolder);
    await global.client.waitForSelector(selectorFile);
    await expectElementExist(selectorFile, true);
    // const firstFileName = await getGridFileName(0);
    // expect(firstFileName).toBe(sampleFileName);
    // cleanup
    await deleteFileFromMenu();
    await expectElementExist(selectorFile, false);
  });

  it.skip('TST5009 - Copy file on different partition [manual]', async () => {});

  /**
   * TODO reindexing don't work in web
   * TODO search not work SplashWorker windows is disabled
   */
  test('TST5010 - Move file', async () => {
    await searchEngine('epub');

    // select file
    await clickOn(selectorFile);
    // open Copy File Dialog
    await clickOn('[data-tid=gridPerspectiveCopySelectedFiles]');
    await setInputKeys(
      'targetPathInput',
      defaultLocationPath + '/empty_folder'
    );
    await clickOn('[data-tid=confirmMoveFiles]');
    await waitForNotification();
    await clickOn('#clearSearchID');
    await global.client.dblclick(selectorFolder);
    await searchEngine('epub', { reindexing: true }); // TODO temp fix: https://trello.com/c/ZfcGGvOM/527-moved-files-is-not-indexing-not-found-in-search
    const firstFileName = await getGridFileName(0);
    expect(firstFileName).toBe('sample.epub');
    // cleanup
    await deleteFileFromMenu();
    await expectElementExist(selectorFile, false);
  });

  it.skip('TST5011 - Move file drag&drop in location navigator [manual]', async () => {});

  it.skip('TST5012 - Move file different partition [manual]', async () => {});

  test('TST5013 - Delete files from selection (many files) [web,minio,electron]', async () => {
    const selectedIds = await selectRowFiles([0, 1, 2]);

    await clickOn('[data-tid=gridPerspectiveDeleteMultipleFiles]');
    await clickOn('[data-tid=confirmDeleteFileDialog]');
    // await waitForNotification();

    for (let i = 0; i < selectedIds.length; i++) {
      await expectElementExist(
        '[data-entry-id="' + selectedIds[i] + '"]',
        false,
        1000
      );
    }

    /* await doubleClickOn(selectorFolder);
    await createTxtFile();
    await searchEngine('note');
    await expectElementExist(selectorFile, true);

    const classNotSelected = await getGridCellClass(0);
    await clickOn(selectorFile);
    const classSelected = await waitUntilClassChanged(
      selectorFile + '/div/div',
      classNotSelected
    );
    expect(classNotSelected).not.toBe(classSelected);

    await clickOn('[data-tid=gridPerspectiveDeleteMultipleFiles]');
    await clickOn('[data-tid=confirmDeleteFileDialog]');
    await waitForNotification();
    await expectElementExist(selectorFile, false); */
  });

  it.skip('TST5015 - Tag file drag&drop in perspective [manual]', async () => {});

  /* test('TST51** - Show/Hide directories in perspective view', async () => { //TODO
    await global.client.waitForVisible(
      '[data-tid=gridPerspectiveToggleShowDirectories]'
    );
    await global.client.click(
      '[data-tid=gridPerspectiveToggleShowDirectories]'
    );
    // Check if the directories are displayed
  }); */
});
