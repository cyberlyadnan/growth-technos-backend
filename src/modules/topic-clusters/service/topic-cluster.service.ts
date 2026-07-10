import { ITopicCluster, TopicCluster } from '../model/topic-cluster.model';
import { TaxonomyRepository } from '@modules/shared/taxonomy/taxonomy.repository';
import { TaxonomyService } from '@modules/shared/taxonomy/taxonomy.service';

const topicClusterRepository = new TaxonomyRepository<ITopicCluster>(TopicCluster);

export const topicClusterService = new TaxonomyService<ITopicCluster>(
  topicClusterRepository,
  'Topic cluster',
  ['name', 'slug', 'description'],
);
