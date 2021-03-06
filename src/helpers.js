'use strict';

const mv = require('mv');
const fs = require('fs');
const path = require('path');
const dateformat = require('dateformat');
const formats = require('./formats');

const isValidFile = (name, dir) => name.indexOf('.') !== 0 && !fs.statSync(path.join(dir, name)).isDirectory();

const mkdir = (folderPath) => {
  try {
    fs.mkdirSync(folderPath);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw new Error('Error occurred while creating a new directory');
    }
  }
};

const getFileExtension = (fileName) => {
  const i = fileName.lastIndexOf('.');
  return (i < 0) ? '' : fileName.substr(i + 1);
};

const organize = (spinner, source, output, fileName, type, listOnly) => {
  const typeDir = path.resolve(output, type);

  if (!listOnly) {
    mkdir(output);
    mkdir(typeDir);
  }

  return new Promise((resolve, reject) => {
    if (listOnly) {
      const listMessage = `mv ${path.resolve(source, fileName)} ${path.resolve(typeDir, fileName)}`;
      spinner.info(listMessage);
      resolve(listMessage);
    } else {
      mv(path.resolve(source, fileName), path.resolve(typeDir, fileName), (err) => {
        if (err) {
          const errorMessage = `Couldn't move ${fileName} because of following error: ${err}`;
          spinner.warn(errorMessage);
          reject(new Error(errorMessage));
        } else {
          const successMessage = `Moved ${fileName} to ${type} folder`;
          spinner.info(successMessage);
          resolve(successMessage);
        }
      });
    }
  });
};

const organizeByDefaults = (names, sourceDir, outputDir, spinner, listOnly) => {
  const moved = [];

  for (let name of names) {
    if (isValidFile(name, sourceDir)) {
      const extension = getFileExtension(name).toUpperCase();
      let isMoved = false;

      for (let type of Object.keys(formats)) {
        if (formats[type].indexOf(extension) >= 0) {
          spinner.info(`Moving file ${name} to ${type}`);

          const pOrganize = organize(spinner, sourceDir, outputDir, name, type, listOnly);

          moved.push(pOrganize);
          isMoved = true;
          break;
        }
      }

      if (!isMoved) {
        spinner.info(`Moving file ${name} to Miscellaneous`);
        moved.push(
          organize(spinner, sourceDir, outputDir, name, 'Miscellaneous', listOnly)
        );
      }
    }
  }

  return moved;
};

const organizeBySpecificFileTypes = (
    spFormats, spFolder, files, sourceDir, outputDir, spinner, listOnly) => {
  const names = files.filter((name) => {
    if (!isValidFile(name, sourceDir)) {
      return false;
    }

    const extension = getFileExtension(name);
    return spFormats.indexOf(extension) !== -1;
  });

  const moved = [];

  for (let name of names) {
    spinner.info(`Moving file ${name} to ${spFolder}`);

    const pOrganize = organize(spinner, sourceDir, outputDir, name, spFolder, listOnly);
    moved.push(pOrganize);
  }

  return moved;
};

const organizeByDates = (files, sourceDir, outputDir, spinner, listOnly) => {
  const moved = [];

  for (let file of files) {
    let date = fs.statSync(path.join(sourceDir, file));
    date = dateformat(new Date(date.mtime), 'yyyy-mm-dd');

    spinner.info(`Moving file ${file} to ${date} folder`);

    const pOrganize = organize(spinner, sourceDir, outputDir, file, date, listOnly);
    moved.push(pOrganize);
  }

  return moved;
};

module.exports = {
  mkdir,
  getFileExtension,
  organize,
  organizeByDefaults,
  organizeBySpecificFileTypes,
  organizeByDates
};
