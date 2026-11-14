import * as React from "react";
import { ErrorInfo } from "react";
import { CLASSES } from "../CSSClassNames";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

/** @internal */
export interface IErrorBoundaryProps {
    message: string;
    retryText: string;
    children: React.ReactNode;
}
/** @internal */
export interface IErrorBoundaryState {
    hasError: boolean;
}

/** @internal */
export class ErrorBoundary extends React.Component<IErrorBoundaryProps, IErrorBoundaryState> {
    constructor(props: IErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_error: Error) {
        return { hasError: true };
    }

    componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
        // error details available via the error boundary's retry UI; no unconditional console logging
    }

    retry = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className={cn("absolute inset-0 flex items-center justify-center", CLASSES.FLEXLAYOUT__ERROR_BOUNDARY_CONTAINER)}>
                    <Alert variant="destructive" className="mx-4 max-w-md grid-cols-1 justify-items-center gap-2 text-center">
                        <AlertTitle className="line-clamp-none">{this.props.message}</AlertTitle>
                        <AlertDescription className="justify-items-center">
                            {/* explicit tabindex: Safari only tabs to elements with an explicit tabindex */}
                            <Button variant="outline" size="sm" tabIndex={0} onClick={this.retry}>
                                {this.props.retryText}
                            </Button>
                        </AlertDescription>
                    </Alert>
                </div>
            );
        }

        return this.props.children;
    }
}
