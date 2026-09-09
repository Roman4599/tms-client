import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // .NET emits RFC 7807 ProblemDetails — surface the `detail` message.
      const detailMessage =
        err.error?.detail ?? "A system error occurred. Please try again.";

      if (err.status === 401) {
        // Expired or missing auth cookie: back to the handshake.
        router.navigate(["/login"]);
      } else {
        // Structured error for the developer console / UI notifications.
        console.error("API Error Response:", detailMessage);
      }
      return throwError(() => err);
    }),
  );
};