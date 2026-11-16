import { Pipe, PipeTransform } from '@angular/core';
import { mediaUrl } from '../../core/utils/media-url';

/** <img [src]="product.imageUrl | mediaUrl"> */
@Pipe({ name: 'mediaUrl' })
export class MediaUrlPipe implements PipeTransform {
  transform(path: string | null | undefined): string {
    return mediaUrl(path);
  }
}
