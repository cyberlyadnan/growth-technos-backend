import { ITag, Tag } from '../model/tag.model';
import { TaxonomyRepository } from '@modules/shared/taxonomy/taxonomy.repository';
import { CreateTaxonomyDto, TaxonomyService, UpdateTaxonomyDto } from '@modules/shared/taxonomy/taxonomy.service';

interface TagDto extends CreateTaxonomyDto {
  color?: string;
}

const tagRepository = new TaxonomyRepository<ITag>(Tag);

export const tagService = new TaxonomyService<ITag>(
  tagRepository,
  'Tag',
  ['name', 'slug', 'description'],
  (dto: CreateTaxonomyDto | UpdateTaxonomyDto) => {
    const data = dto as TagDto;
    return {
      ...(data.color !== undefined && { color: data.color || undefined }),
    };
  },
);
