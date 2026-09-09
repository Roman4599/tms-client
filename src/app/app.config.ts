import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideRouter, withComponentInputBinding } from "@angular/router";
import {
  provideHttpClient,
  withInterceptors,
  withXsrfConfiguration,
} from "@angular/common/http";
import { provideAnimations } from "@angular/platform-browser/animations";
import { routes } from "./app.routes";
import { credentialsInterceptor } from "./interceptors/credentials.interceptor";
import { errorInterceptor } from "./interceptors/error.interceptor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([credentialsInterceptor, errorInterceptor]),
      withXsrfConfiguration({
        cookieName: "XSRF-TOKEN", // set by the .NET antiforgery middleware
        headerName: "X-XSRF-TOKEN", // header the .NET middleware validates
      }),
    ),
    provideAnimations(),
  ],
};