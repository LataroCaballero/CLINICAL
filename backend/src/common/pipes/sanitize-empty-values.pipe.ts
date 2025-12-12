import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class SanitizeEmptyValuesPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        if (value === null || typeof value !== 'object') {
            return value;
        }

        return Object.fromEntries(
            Object.entries(value).map(([key, val]) => {
                // Reemplaza strings vacías o null -> undefined
                if (val === "" || val === null) {
                    return [key, undefined];
                }
                return [key, val];
            })
        );
    }
}
