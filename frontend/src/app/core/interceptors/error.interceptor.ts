import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.removeItem('token');
        router.navigate(['/login']);
        snackBar.open('Session expired. Please log in again.', 'Close', { duration: 3000 });
      } else if (error.status >= 500) {
        snackBar.open('Unable to load your expenses. Please try again.', 'Close', { duration: 3000 });
      }
      return throwError(() => error);
    })
  );
};
