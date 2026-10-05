import { NgModule, Optional, SkipSelf } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';

@NgModule({
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
})
export class CoreModule {
  // Padrão clássico: evita que o CoreModule seja importado mais do que uma vez (duplicaria
  // o interceptor, fazendo cada pedido levar o cabeçalho Authorization repetido N vezes).
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule já foi importado. Importa-o apenas no AppModule.');
    }
  }
}
