import endsWith from 'lodash-es/endsWith';
import { IFileOptions, IUploadOptions } from './file-uploader.types';
import { Observable, from, Subscription } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { I18nInterface, I18nService } from 'ng-devui/i18n';

@Injectable()
export class SelectFiles {
  NOT_ALLOWED_FILE_TYPE_MSG: string;
  BEYOND_MAXIMAL_FILE_SIZE_MSG: string;
  i18nText: I18nInterface['upload'];
  i18nSubscription: Subscription;
  constructor(private i18n: I18nService) {
    this.i18nText = this.i18n.getI18nText().upload;
    this.i18nSubscription = this.i18n.langChange().subscribe((data) => {
      this.i18nText = data.upload;
    });
  }

  selectFiles = ({ multiple, accept }: IFileOptions): Promise<File[]> => {
    return new Promise((resolve) => {
      const tempNode = document.getElementById('d-upload-temp');
      if (tempNode) {
        document.body.removeChild(tempNode);
      }
      const input = document.createElement('input');

      input.style.position = 'fixed';
      input.style.left = '-2000px';
      input.style.top = '-2000px';

      input.setAttribute('id', 'd-upload-temp');
      input.setAttribute('type', 'file');
      if (multiple) {
        input.setAttribute('multiple', '');
      }
      if (accept) {
        input.setAttribute('accept', accept);
      }

      input.addEventListener('change', event => {
        resolve(Array.prototype.slice.call((event.target as HTMLInputElement).files));
      });
      document.body.appendChild(input); // Fix campatability issue with Internet Explorer 11
      this.simulateClickEvent(input);
    });
  }

  isAllowedFileType = (accept: string, file: File) => {
    if (accept) {
      const acceptArr = accept.split(',');
      return acceptArr.reduce((result: boolean, item: string) => {
        return result || file.type.indexOf(item.replace(/[\.*]/g, '')) > -1 || endsWith(file.name, item);
      }, false);
    }
    return true;
  }

  beyondMaximalSize = (fileSize, maximumSize) => {
    if (maximumSize) {
      return fileSize > 1024 * 1024 * maximumSize;
    }
    return false;
  }

  triggerSelectFiles = (fileOptions: IFileOptions, uploadOptions: IUploadOptions) => {
    const { multiple, accept } = fileOptions;
    return this._validateFiles(from(this.selectFiles({ multiple, accept })), accept, uploadOptions);
  }


  triggerDropFiles = (fileOptions: IFileOptions, uploadOptions: IUploadOptions, files: any) => {
    const { multiple, accept } = fileOptions;
    return this._validateFiles(new Observable(observer => observer.next(files)), accept, uploadOptions);

  }

  _validateFiles(observable, accept, uploadOptions) {
    return observable.pipe(
      mergeMap(file => <any>file),
      map((file) => {
        if (!this.isAllowedFileType(accept, <File>file)) {
          this.NOT_ALLOWED_FILE_TYPE_MSG = this.i18nText.getNotAllowedFileTypeMsg((<File>file).name, accept);
          throw new Error(this.NOT_ALLOWED_FILE_TYPE_MSG);
        }

        if (this.beyondMaximalSize((<File>file).size, uploadOptions.maximumSize)) {
          this.BEYOND_MAXIMAL_FILE_SIZE_MSG = this.i18nText.getBeyondMaximalFileSizeMsg((<File>file).size, uploadOptions.maximumSize);
          throw new Error(this.BEYOND_MAXIMAL_FILE_SIZE_MSG);
        }
        return file;
      })
    );
  }

  simulateClickEvent(input) {
    const evt = document.createEvent('MouseEvents');
    evt.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
    input.dispatchEvent(evt);
  }
}
