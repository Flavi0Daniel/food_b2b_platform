import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ClientRoutingModule } from './client-routing.module';

@NgModule({
  imports: [SharedModule, ClientRoutingModule],
})
export class ClientModule {}
