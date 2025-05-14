import { createContext, useContext } from 'react';
import { WizardCtxObj } from './types';
import moment from 'moment';
import toString from 'lodash/toString';
import { File } from './types';

export const WizardCtx = createContext<WizardCtxObj | null>(null);
export const useWizardCtx = (): WizardCtxObj => {
    const context = useContext(WizardCtx);
    if (!context) {
      throw new Error('useWizardCtx must be used within a WizardProvider');
    }
    return context;
};


const DIRECTORY_MIME_TYPE = 'inode/directory';

export const getFileSize = (bytes: number, si: boolean) => {
  const unit = si ? 1000 : 1024;
  if (bytes < unit) {
    return bytes + ' B';
  }
  const exp = Math.floor(Math.log(bytes) / Math.log(unit));
  let prefix = 'kMGTPE'.charAt(exp - 1);
  if (!si) {
    prefix += 'i';
  }
  return parseFloat(toString(bytes / Math.pow(unit, exp))).toFixed(2) + ' ' + prefix + 'B';
};

export const isDirectory = (file: File) => file?.mime === DIRECTORY_MIME_TYPE;

export const fromNow = time => {
  if (time === null || time === undefined) {
    return 'Never';
  }
  return moment(time).fromNow();
};

export const sampleExamplesData = [
  {
    "loan_amnt": 10000.00,
    "term": "36 months",
    "int_rate": 11.44,
    "installment": 329.48,
    "grade": "B",
    "sub_grade": "B4",
    "emp_title": "Marketing",
    "emp_length": "10+ years",
    "home_ownership": "RENT",
    "annual_inc": 117000.00,
    "verification_status": "Not Verified",
    "issue_d": "Jan-2015",
    "loan_status": "Fully Paid",
    "purpose": "vacation",
    "title": "Vacation",
    "dti": 26.24,
    "earliest_cr_line": "Jun-1990",
    "open_acc": 16.00,
    "pub_rec": 0.00,
    "revol_bal": 36369.00,
    "revol_util": 41.80,
    "total_acc": 25.00,
    "initial_list_status": "w",
    "application_type": "INDIVIDUAL",
    "mort_acc": 0.00,
    "pub_rec_bankruptcies": 0.00,
    "address": "0185 Michelle Gateway\r\nMendozaberg, OK 22690"
  }
];
