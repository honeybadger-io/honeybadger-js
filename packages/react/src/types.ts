import { ComponentType, ElementType, ErrorInfo, PropsWithChildren, ReactNode } from 'react';
import Honeybadger from '@honeybadger-io/js';

export type DefaultErrorComponentProps = {
    error: Error | null
    info: ErrorInfo | null
}

export type HoneybadgerErrorBoundaryProps = PropsWithChildren<{
    honeybadger: typeof Honeybadger
    showUserFeedbackFormOnError?: boolean
    ErrorComponent?: ReactNode | ComponentType | ElementType
}>

export type HoneybadgerErrorBoundaryState = {
    errorOccurred: boolean
} & DefaultErrorComponentProps;
